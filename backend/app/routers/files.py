import os
from typing import List, Optional
from fastapi import APIRouter, Depends, File, Form, Query, UploadFile, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import schemas, crud, models
from ..auth import get_current_verified_user
from ..database import get_db
from ..models import User as UserModel
from ..utils.storage import save_file
from ..utils.encryption import decrypt_to_bytes


router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload", response_model=schemas.FileOut, status_code=status.HTTP_201_CREATED)
def upload_file(
    file: UploadFile = File(...),
    is_public: bool = Form(False),
    folder_id: Optional[int] = Form(None),
    share_with: List[str] = Form(default=[]),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")

    # Validate folder ownership if provided
    if folder_id is not None:
        folder = crud.get_folder_by_id(db, folder_id)
        if not folder or folder.owner_id != current_user.id:
            raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    file_path, file_size = save_file(file, current_user.id)

    db_file = crud.create_file_for_user(
        db,
        owner_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        is_public=is_public,
        folder_id=folder_id,
    )

    if share_with:
        result = crud.share_file_with_users(db, db_file, share_with)
        if result["owner"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"You cannot share a file with yourself")
        if result["not_found"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Could not find users: {', '.join(result['not_found'])}")
        if result["already_shared"]:
            raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail=f"Users already shared with: {', '.join(result['already_shared'])}")
    return db_file


@router.get("/", response_model=list[schemas.FileOut])
def list_my_files(
    folder_id: Optional[int] = Query(None, description="Filter by folder. Omit for all files."),
    root_only: bool = Query(False, description="If true, return only files not in any folder."),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
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
    file_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
):
    file_obj = db.query(crud.models.File).filter(
        crud.models.File.id == file_id, crud.models.File.owner_id == current_user.id
    ).first()
    if not file_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return file_obj


@router.get("/{file_id}/download")
def download_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
):
    file_obj = db.query(crud.models.File).filter(
        crud.models.File.id == file_id, crud.models.File.owner_id == current_user.id
    ).first()
    if not file_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    file_path = file_obj.file_path
    try:
        from pathlib import Path

        path = Path(file_path)
        if not path.is_absolute():
            base_dir = Path(__file__).resolve().parents[2]
            path = base_dir / file_path

        with path.open("rb") as f:
            plaintext = decrypt_to_bytes(f)
    except FileNotFoundError:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Stored file missing")

    return StreamingResponse(
        iter([plaintext]),
        media_type="application/octet-stream",
        headers={"Content-Disposition": f'attachment; filename="{file_obj.filename}"'},
    )


@router.delete("/{file_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_file(
    file_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
):
    file_obj = db.query(crud.models.File).filter(
        crud.models.File.id == file_id,
        crud.models.File.owner_id == current_user.id,
    ).first()

    if not file_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    try:
        from pathlib import Path
        path = Path(file_obj.file_path)
        if not path.is_absolute():
            base_dir = Path(__file__).resolve().parents[2]
            path = base_dir / file_obj.file_path
        if path.exists():
            os.remove(path)
    except Exception:
        pass  # Don't block DB deletion if file is already missing from disk

    # Decrement storage counter
    current_user.storage_used_bytes = max(0, (current_user.storage_used_bytes or 0) - (file_obj.file_size or 0))

    db.delete(file_obj)
    db.commit()


# --- FILE SHARING ENDPOINTS ---

class ShareRequest(schemas.BaseModel):
    emails: List[str]


@router.post("/{file_id}/share", status_code=status.HTTP_200_OK)
def share_file(
    file_id: int,
    body: ShareRequest,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
):
    """Grant access to a file for a list of user emails. Owner only."""
    file_obj = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.owner_id == current_user.id,
    ).first()
    if not file_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    result = crud.share_file_with_users(db, file_obj, body.emails)
    return {
        "detail": "Shared successfully",
        "shared": result["shared"],
        "already_shared": result["already_shared"],
        "not_found": result["not_found"],
    }


@router.delete("/{file_id}/share/{user_id}", status_code=status.HTTP_200_OK)
def revoke_file_share(
    file_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
):
    """Revoke a specific user's access to a file. Owner only."""
    file_obj = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.owner_id == current_user.id,
    ).first()
    if not file_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    removed = crud.revoke_file_share(db, file_obj, user_id)
    if not removed:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Permission not found")

    return {"detail": "Access revoked successfully"}
