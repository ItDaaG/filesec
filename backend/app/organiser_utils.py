"""
Agent-only helpers for folder organisation (read-only, no CRUD mutations).
Used by /agent/organiser/folder_tree — authoritative tree + file metadata from the DB.
Clustering, labelling, and reorganisation plans are handled by the LLM in the organiser subagent.
"""
from __future__ import annotations

from typing import Any, Dict, Optional
from uuid import UUID

from sqlalchemy.orm import Session

from .models import File, Folder


def _file_summary(f: File) -> Dict[str, Any]:
    return {
        "id": str(f.id),
        "filename": f.filename,
        "mime_type": f.mime_type,
        "file_size": f.file_size,
        "is_public": f.is_public,
        "created_at": f.created_at.isoformat() if f.created_at else None,
    }


def build_folder_tree(
    db: Session,
    *,
    folder_id: UUID,
    owner_id: int,
    depth_limit: Optional[int] = None,
    current_depth: int = 0,
) -> Optional[Dict[str, Any]]:
    folder = (
        db.query(Folder)
        .filter(Folder.id == folder_id, Folder.owner_id == owner_id)
        .first()
    )
    if folder is None:
        return None

    files = (
        db.query(File)
        .filter(File.folder_id == folder_id, File.owner_id == owner_id)
        .all()
    )
    children = (
        db.query(Folder)
        .filter(Folder.parent_id == folder_id, Folder.owner_id == owner_id)
        .all()
    )

    node: Dict[str, Any] = {
        "id": str(folder.id),
        "name": folder.name,
        "files": [_file_summary(f) for f in files],
        "subfolders": [],
    }

    for sub in children:
        if depth_limit is not None and current_depth + 1 > depth_limit:
            node["subfolders"].append(
                {
                    "id": str(sub.id),
                    "name": sub.name,
                    "truncated": True,
                    "note": "Depth limit reached; use a deeper depth_limit or this folder id to expand.",
                }
            )
        else:
            nested = build_folder_tree(
                db,
                folder_id=sub.id,
                owner_id=owner_id,
                depth_limit=depth_limit,
                current_depth=current_depth + 1,
            )
            if nested:
                node["subfolders"].append(nested)

    return node
