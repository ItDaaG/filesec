import io
from uuid import UUID

import pdfplumber
from google import genai
from google.genai import types

from .. import models
from ..config import EMBEDDING_DIMENSION, GEMINI_API_KEY, GEMINI_EMBEDDING_MODEL
from ..database import SessionLocal
from ..utils.encryption import encrypt_bytes

CHUNK_SIZE = 1500
CHUNK_OVERLAP = 200
BATCH = 100


def _chunks(text: str) -> list[str]:
    out, start = [], 0
    while start < len(text):
        end = start + CHUNK_SIZE
        out.append(text[start:end])
        if end >= len(text):
            break
        start = end - CHUNK_OVERLAP
    return out


def _pdf_to_text(data: bytes) -> str:
    with pdfplumber.open(io.BytesIO(data)) as pdf:
        return "\n\n".join(page.extract_text() or "" for page in pdf.pages).strip()

def index_pdf(file_id_str: str, pdf_bytes: bytes) -> None:
    db = SessionLocal()
    try:
        file_uuid = UUID(file_id_str)
        row = db.query(models.File).filter(models.File.id == file_uuid).first()
        if not row:
            return

        if (row.mime_type or "").split(";")[0].strip().lower() != "application/pdf":
            row.embedding_status = None
            db.commit()
            return

        if not GEMINI_API_KEY:
            row.embedding_status = "skipped"
            db.commit()
            return

        text = _pdf_to_text(pdf_bytes)
        chunks = _chunks(text) if text else []
        if not chunks:
            row.embedding_status = "failed"
            db.commit()
            return

        vectors = _embed(genai.Client(api_key=GEMINI_API_KEY), chunks)

        db.query(models.FileEmbeddingChunk).filter(
            models.FileEmbeddingChunk.file_id == file_uuid
        ).delete(synchronize_session=False)

        db.add_all(
            models.FileEmbeddingChunk(
                file_id=file_uuid,
                chunk_index=i,
                embedding=v,
                content_ciphertext=encrypt_bytes(chunks[i].encode("utf-8")),
            )
            for i, v in enumerate(vectors)
        )

        row.embedding_status = "indexed"
        db.commit()

    except Exception as e:
        db.rollback()
        print(f"PDF embedding failed for {file_id_str}: {e}")
        try:
            row = db.query(models.File).filter(models.File.id == UUID(file_id_str)).first()
            if row:
                row.embedding_status = "failed"
                db.commit()
        except Exception:
            pass
    finally:
        db.close()


def _embed(client: genai.Client, texts: list[str]) -> list[list[float]]:
    cfg = types.EmbedContentConfig(
        task_type="RETRIEVAL_DOCUMENT",
        output_dimensionality=EMBEDDING_DIMENSION,
    )
    vectors = []
    for i in range(0, len(texts), BATCH):
        r = client.models.embed_content(
            model=GEMINI_EMBEDDING_MODEL,
            contents=texts[i : i + BATCH],
            config=cfg,
        )
        vectors.extend(list(e.values) for e in r.embeddings)
    return vectors


def embed_query_text(query: str) -> list[float]:
    """Embed a search query using RETRIEVAL_QUERY (pair with RETRIEVAL_DOCUMENT chunks in DB)."""
    if not GEMINI_API_KEY:
        raise ValueError("GEMINI_API_KEY is not configured")
    q = (query or "").strip()
    if not q:
        raise ValueError("query must be non-empty")
    client = genai.Client(api_key=GEMINI_API_KEY)
    cfg = types.EmbedContentConfig(
        task_type="RETRIEVAL_QUERY",
        output_dimensionality=EMBEDDING_DIMENSION,
    )
    r = client.models.embed_content(
        model=GEMINI_EMBEDDING_MODEL,
        contents=[q],
        config=cfg,
    )
    if not r.embeddings:
        raise RuntimeError("Gemini returned no query embedding")
    vals = r.embeddings[0].values
    vec = list(vals) if vals is not None else []
    if len(vec) != EMBEDDING_DIMENSION:
        raise RuntimeError(f"query embedding dim {len(vec)} != {EMBEDDING_DIMENSION}")
    return vec
