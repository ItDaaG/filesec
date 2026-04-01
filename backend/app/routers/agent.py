import os
from typing import Optional
from uuid import UUID

import requests
from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, File, Folder
from ..auth import get_agent_user, get_current_verified_user
from ..schemas import UserOut, FileOut, FolderOut
from ..organiser_utils import build_folder_tree
router = APIRouter(prefix="/agent", tags=["agent"])


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
    print("session_resp", session_resp.status_code)
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

    print("creating run payload")
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

@router.get("/list-users", response_model=list[UserOut])
def list_users(current_user: User = Depends(get_agent_user), db: Session = Depends(get_db)):
    _get_verified_user_or_404(db, current_user.id)
    return db.query(User).all()

@router.get("/list_all_folders", response_model=list[FolderOut])
def list_all_folders(db: Session = Depends(get_db), current_user: User = Depends(get_agent_user)):
    _get_verified_user_or_404(db, current_user.id)
    return db.query(Folder).filter(Folder.owner_id == current_user.id).all()

@router.get("/user_by_email", response_model=UserOut)
def user_by_email(email: str, current_user: User = Depends(get_agent_user), db: Session = Depends(get_db)):
    user = db.query(User).filter(User.email == email, User.id == current_user.id).first()
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


# --- Organiser (agent tools; owner-scoped, no mutations) ---


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