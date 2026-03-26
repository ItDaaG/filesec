import os
import mimetypes
from pathlib import Path
from typing import List, Optional
from uuid import UUID

from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import schemas, crud, models
from ..auth import get_current_verified_user, get_verified_user_or_agent_user
from ..database import get_db
from ..models import User as UserModel
from ..utils.storage import save_file
from ..utils.encryption import decrypt_to_bytes


router = APIRouter(prefix="/files", tags=["files"])


# ---------------------------------------------------------------------------
# Helpers
# ---------------------------------------------------------------------------

def _get_owned_file_or_404(db: Session, file_id: UUID, owner_id: int) -> models.File:
    """Fetch a file owned by owner_id, or raise 404. Use for owner-only mutation endpoints."""
    file_obj = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.owner_id == owner_id,
    ).first()
    if not file_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return file_obj


def _resolve_file_path(file_path: str) -> Path:
    """Return an absolute Path for a stored file, resolving relative paths from the project root."""
    path = Path(file_path)
    if not path.is_absolute():
        base_dir = Path(__file__).resolve().parents[2]
        path = base_dir / file_path
    return path


# ---------------------------------------------------------------------------
# Endpoints
# ---------------------------------------------------------------------------

@router.post("/upload", response_model=schemas.FileOut, status_code=status.HTTP_201_CREATED)
def upload_file(
    file: UploadFile = File(...),
    is_public: bool = Form(False),
    folder_id: Optional[UUID] = Form(None),
    share_with: List[str] = Form(default=[]),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")

    if folder_id is not None:
        folder = crud.get_folder_by_id(db, folder_id)
        if not folder or folder.owner_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    raw_mime = (file.content_type or "").strip()
    mime_from_upload = raw_mime.split(";")[0].strip() if raw_mime else None
    mime_from_filename = mimetypes.guess_type(file.filename)[0] if file.filename else None
    mime_type = mime_from_upload
    if not mime_type or mime_type == "application/octet-stream":
        mime_type = mime_from_filename
    mime_type = mime_type or "application/octet-stream"

    file_path, file_size = save_file(file, current_user.id)

    db_file = crud.create_file_for_user(
        db,
        owner_id=current_user.id,
        filename=file.filename,
        mime_type=mime_type,
        file_path=file_path,
        file_size=file_size,
        is_public=is_public,
        folder_id=folder_id,
    )

    if share_with:
        result = crud.share_file_with_users(db, db_file, share_with)
        if result["owner"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="You cannot share a file with yourself")
        if result["not_found"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not find users: {', '.join(result['not_found'])}")
        if result["already_shared"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Users already shared with: {', '.join(result['already_shared'])}")
    return db_file


@router.get("/", response_model=list[schemas.FileOut])
def list_my_files(
    folder_id: Optional[UUID] = Query(None, description="Filter by folder. Omit for all files."),
    root_only: bool = Query(False, description="If true, return only files not in any folder."),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_verified_user_or_agent_user),
):
    query = db.query(models.File).filter(models.File.owner_id == current_user.id)
    if folder_id is not None:
        query = query.filter(models.File.folder_id == folder_id)
    elif root_only:
        query = query.filter(models.File.folder_id.is_(None))
    return query.all()


@router.get("/shared-with-me", response_model=list[schemas.FileOut])
def list_shared_with_me(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
):
    """List files explicitly shared with the current user via FilePermission."""
    files = (
        db.query(models.File)
        .join(models.FilePermission, models.File.id == models.FilePermission.file_id)
        .filter(models.FilePermission.user_id == current_user.id)
        .all()
    )
    return files


@router.get("/{file_id}", response_model=schemas.FileOut)
def get_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
):
    file_obj = db.query(models.File).filter(models.File.id == file_id).first()
    if not file_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    if file_obj.owner_id == current_user.id or file_obj.is_public:
        return file_obj

    has_permission = db.query(models.FilePermission).filter(
        models.FilePermission.file_id == file_id,
        models.FilePermission.user_id == current_user.id,
    ).first()
    if not has_permission:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    return file_obj


@router.patch("/{file_id}", response_model=schemas.FileOut)
def update_file(
    file_id: UUID,
    body: schemas.FileUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_verified_user_or_agent_user),
):
    """Update filename or visibility. Owner only."""
    file_obj = _get_owned_file_or_404(db, file_id, current_user.id)

    if body.filename is not None:
        file_obj.filename = body.filename.strip()
    if body.is_public is not None:
        file_obj.is_public = body.is_public

    db.commit()
    db.refresh(file_obj)
    return file_obj


@router.get("/{file_id}/permissions", response_model=list[schemas.SharedUser])
def get_file_permissions(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
):
    """List users explicitly granted access to this file. Owner only."""
    _get_owned_file_or_404(db, file_id, current_user.id)

    users = (
        db.query(models.User)
        .join(models.FilePermission, models.FilePermission.user_id == models.User.id)
        .filter(models.FilePermission.file_id == file_id)
        .all()
    )
    return users


@router.get("/{file_id}/download")
def download_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_verified_user_or_agent_user),
):
    file_obj = db.query(models.File).filter(models.File.id == file_id).first()
    if not file_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    if not (file_obj.owner_id == current_user.id or file_obj.is_public):
        has_permission = db.query(models.FilePermission).filter(
            models.FilePermission.file_id == file_id,
            models.FilePermission.user_id == current_user.id,
        ).first()
        if not has_permission:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    path = _resolve_file_path(file_obj.file_path)
    try:
        with path.open("rb") as f:
            plaintext = decrypt_to_bytes(f)
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored file missing")

    return StreamingResponse(
        iter([plaintext]),
        media_type=file_obj.mime_type or "application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{file_obj.filename}"'},
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_verified_user_or_agent_user),
):
    file_obj = _get_owned_file_or_404(db, file_id, current_user.id)

    path = _resolve_file_path(file_obj.file_path)
    try:
        if path.exists():
            os.remove(path)
    except Exception:
        pass  # Don't block DB deletion if file is already missing from disk

    current_user.storage_used_bytes = max(0, (current_user.storage_used_bytes or 0) - (file_obj.file_size or 0))

    db.delete(file_obj)
    db.commit()


# --- FILE SHARING ENDPOINTS ---

class ShareRequest(schemas.BaseModel):
    emails: List[str]


@router.post("/{file_id}/share", status_code=status.HTTP_200_OK)
def share_file(
    file_id: UUID,
    body: ShareRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_verified_user_or_agent_user),
):
    """Grant access to a file for a list of user emails. Owner only."""
    file_obj = _get_owned_file_or_404(db, file_id, current_user.id)

    result = crud.share_file_with_users(db, file_obj, body.emails)
    return {
        "detail": "Shared successfully",
        "shared": result["shared"],
        "already_shared": result["already_shared"],
        "not_found": result["not_found"],
    }


@router.delete("/{file_id}/share/{user_id}", status_code=status.HTTP_200_OK)
def revoke_file_share(
    file_id: UUID,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_verified_user_or_agent_user),
):
    """Revoke a specific user's access to a file. Owner only."""
    file_obj = _get_owned_file_or_404(db, file_id, current_user.id)

    removed = crud.revoke_file_share(db, file_obj, user_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found")

    return {"detail": "Access revoked successfully"}
