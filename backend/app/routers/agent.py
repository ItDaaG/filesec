"""
 AGENT SPECIFIC ROUTERS. Frontend cannot access these routes directly.
 Only through agent activation.

"""

import os
from collections import defaultdict
from typing import Optional
from uuid import UUID

import requests
from fastapi import APIRouter, Depends, HTTPException, Query, status
from pydantic import BaseModel
from sqlalchemy import text
from sqlalchemy.orm import Session

from ..auth import get_agent_user, get_current_verified_user
from ..config import GEMINI_API_KEY
from ..database import get_db
from ..models import File, FileEmbeddingChunk, Folder, User
from ..schemas import FileOut, FolderOut, UserOut
from ..services.pdf_embeddings import embed_query_text
from ..utils.encryption import decrypt_chunk_content_to_str
from ..utils.organiser import build_folder_tree
from ..crud import get_user_by_email
router = APIRouter(prefix="/agent", tags=["agent"])

# Globally nearest chunk rows before grouping by file (caps DB + decrypt cost).
PDF_SEARCH_CHUNK_POOL = 500
# Max file groups in query-to-file response after grouping by min_distance.
PDF_SEARCH_MAX_FILES = 30


class ChatRequest(BaseModel):
    message: str
    session_id: str | None = None
    app_name: str = "file_agent"


def _extract_last_model_reply_text(events: list) -> str:
    """
    ADK /run returns events where a single model turn may include both function_call and multiple
    text parts. Concatenate every text part in each model message; keep the last non-empty message
    (final assistant reply to the user).
    """
    last_text = ""
    for event in events:
        content = event.get("content") or {}
        if content.get("role") != "model":
            continue
        parts = content.get("parts") or []
        chunks: list[str] = []
        for part in parts:
            t = part.get("text")
            if t:
                chunks.append(t)
        if chunks:
            last_text = "\n".join(chunks)
    return last_text


def _get_verified_user_or_404(db: Session, user_id: int) -> User:
    user = db.query(User).filter(User.id == user_id).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    if not user.is_email_verified:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Email not verified")
    return user


@router.post("/chat")
def chat(body: ChatRequest, current_user: User = Depends(get_current_verified_user)):
    print("chat request received")
    adk_base_url = os.getenv("ADK_API_BASE_URL", "http://localhost:8081").rstrip("/")
    user_id = str(current_user.id)
    session_id = body.session_id or f"session-{user_id}"
    print("user_id", user_id)
    session_url = f"{adk_base_url}/apps/{body.app_name}/users/{user_id}/sessions/{session_id}"
    session_resp = requests.get(session_url, timeout=10)
    if session_resp.status_code == status.HTTP_404_NOT_FOUND:
        create_resp = requests.post(session_url, json={}, timeout=10)
        if create_resp.status_code not in (status.HTTP_200_OK, status.HTTP_201_CREATED):
            raise HTTPException(
                status_code=status.HTTP_502_BAD_GATEWAY,
                detail="Failed to create ADK session",
            )
    elif session_resp.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail="Failed to fetch ADK session",
        )

    run_payload = {
        "appName": body.app_name,
        "userId": user_id,
        "sessionId": session_id,
        "newMessage": {
            "role": "user",
            "parts": [{"text": body.message}],
        },
    }
    run_resp = requests.post(f"{adk_base_url}/run", json=run_payload, timeout=300)
    if run_resp.status_code != status.HTTP_200_OK:
        raise HTTPException(
            status_code=status.HTTP_502_BAD_GATEWAY,
            detail=f"ADK run failed: {run_resp.text}",
        )

    events = run_resp.json()
    reply_text = _extract_last_model_reply_text(events)

    return {
        "session_id": session_id,
        "response": reply_text,
        "raw_events": events,
    }


@router.get("/list_all_folders", response_model=list[FolderOut])
def list_all_folders(db: Session = Depends(get_db), current_user: User = Depends(get_agent_user)):
    _get_verified_user_or_404(db, current_user.id)
    return db.query(Folder).filter(Folder.owner_id == current_user.id).all()

@router.get("/user_by_email", response_model=UserOut)
def user_by_email(email: str, current_user: User = Depends(get_agent_user), db: Session = Depends(get_db)):
    user = get_user_by_email(db, email)
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user    

@router.get("/file_by_name", response_model=FileOut)
def file_by_name(file_name: str, db: Session = Depends(get_db), current_user: User = Depends(get_agent_user)):
    _get_verified_user_or_404(db, current_user.id)
    file = db.query(File).filter(File.filename == file_name, File.owner_id == current_user.id).first()
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return file

@router.get("/folder_by_name", response_model=FolderOut)
def folder_by_name(folder_name: str, db: Session = Depends(get_db), current_user: User = Depends(get_agent_user)):
    _get_verified_user_or_404(db, current_user.id)
    folder = db.query(Folder).filter(Folder.name == folder_name, Folder.owner_id == current_user.id).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return folder


# --- Organiser (agent tools) ---


@router.get("/organiser/folder_tree")
def organiser_folder_tree(
    folder_id: UUID,
    depth_limit: Optional[int] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_agent_user),
):
    """Nested folder + file metadata for analysis (starting at folder_id)."""
    _get_verified_user_or_404(db, current_user.id)
    tree = build_folder_tree(
        db,
        folder_id=folder_id,
        owner_id=current_user.id,
        depth_limit=depth_limit,
    )
    if tree is None:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return {"tree": tree}

class PdfSearchChunk(BaseModel):
    chunk_index: int
    distance: float
    content: str


class PdfSearchFileResult(BaseModel):
    file_id: UUID
    filename: str
    min_distance: float
    chunks: list[PdfSearchChunk]


class PdfSearchResponse(BaseModel):
    query: str
    results: list[PdfSearchFileResult]


class TopFileSearchHit(BaseModel):
    file_id: UUID
    filename: str
    distance: float
    chunk_index: int
    content: str


class TopFilesResponse(BaseModel):
    query: str
    results: list[TopFileSearchHit]


def _vector_literal(vec: list[float]) -> str:
    return "[" + ",".join(str(x) for x in vec) + "]"


@router.get("/query-to-file", response_model=PdfSearchResponse)
def query_to_file(
    query: str = Query(..., min_length=1, description="Natural-language query; matched against indexed PDF chunks"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_agent_user),
):
    """Semantic search over the current user's PDFs that have chunk embeddings (pgvector cosine distance)."""
    _get_verified_user_or_404(db, current_user.id)
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY not configured",
        )
    try:
        vec = embed_query_text(query)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e

    dist = FileEmbeddingChunk.embedding.cosine_distance(vec)
    rows = (
        db.query(FileEmbeddingChunk, File, dist.label("distance"))
        .join(File, File.id == FileEmbeddingChunk.file_id)
        .filter(File.owner_id == current_user.id)
        .filter(File.mime_type == "application/pdf")
        .order_by(dist)
        .limit(PDF_SEARCH_CHUNK_POOL)
        .all()
    )

    # file_id -> list of (chunk_index, distance, orm_chunk, filename)
    by_file: dict[UUID, list[tuple[int, float, FileEmbeddingChunk, str]]] = defaultdict(list)
    for chunk, file_row, distance in rows:
        by_file[file_row.id].append(
            (chunk.chunk_index, float(distance), chunk, file_row.filename or ""),
        )

    ranked: list[tuple[UUID, str, float]] = []
    for fid, items in by_file.items():
        min_d = min(t[1] for t in items)
        filename = items[0][3]
        ranked.append((fid, filename, min_d))
    ranked.sort(key=lambda x: x[2])

    results: list[PdfSearchFileResult] = []
    for fid, filename, min_distance in ranked[:PDF_SEARCH_MAX_FILES]:
        items = by_file[fid]
        items_sorted = sorted(items, key=lambda t: t[1])
        chunks_out = [
            PdfSearchChunk(
                chunk_index=ci,
                distance=d,
                content=decrypt_chunk_content_to_str(ch.content_ciphertext),
            )
            for ci, d, ch, _ in items_sorted
        ]
        results.append(
            PdfSearchFileResult(
                file_id=fid,
                filename=filename,
                min_distance=min_distance,
                chunks=chunks_out,
            )
        )

    return PdfSearchResponse(query=query.strip(), results=results)


_TOP_FILES_SQL = text(
    """
    WITH q AS (SELECT CAST(:vec AS vector) AS qv)
    SELECT * FROM (
        SELECT DISTINCT ON (fec.file_id)
            fec.file_id AS file_id,
            fec.chunk_index AS chunk_index,
            fec.content_ciphertext AS content_ciphertext,
            f.filename AS filename,
            (fec.embedding <=> q.qv) AS distance
        FROM file_embedding_chunks AS fec
        INNER JOIN files AS f ON f.id = fec.file_id
        CROSS JOIN q
        WHERE f.owner_id = :owner_id
          AND f.mime_type = 'application/pdf'
        ORDER BY fec.file_id, (fec.embedding <=> q.qv) ASC
    ) AS sub
    ORDER BY distance ASC
    LIMIT :lim
    """
)


@router.get("/query-to-top-files", response_model=TopFilesResponse)
def query_to_top_files(
    query: str = Query(..., min_length=1, description="Natural-language query; matched against indexed PDF chunks"),
    limit: int = Query(10, ge=1, le=50, description="Number of files to return (best matching chunk per file)"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_agent_user),
):
    """Top-N PDFs by best chunk cosine distance (one chunk per file via DISTINCT ON)."""
    _get_verified_user_or_404(db, current_user.id)
    if not GEMINI_API_KEY:
        raise HTTPException(
            status_code=status.HTTP_503_SERVICE_UNAVAILABLE,
            detail="GEMINI_API_KEY not configured",
        )
    try:
        vec = embed_query_text(query)
    except ValueError as e:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=str(e)) from e
    except RuntimeError as e:
        raise HTTPException(status_code=status.HTTP_502_BAD_GATEWAY, detail=str(e)) from e

    vec_lit = _vector_literal(vec)
    rows = db.execute(
        _TOP_FILES_SQL,
        {"vec": vec_lit, "owner_id": current_user.id, "lim": limit},
    ).mappings().all()

    results: list[TopFileSearchHit] = []
    for row in rows:
        content = decrypt_chunk_content_to_str(row["content_ciphertext"])
        results.append(
            TopFileSearchHit(
                file_id=row["file_id"],
                filename=row["filename"] or "",
                distance=float(row["distance"]),
                chunk_index=int(row["chunk_index"]),
                content=content,
            )
        )

    return TopFilesResponse(query=query.strip(), results=results)