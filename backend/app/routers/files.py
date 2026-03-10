import os
from typing import List
from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import schemas, crud, models
from ..auth import get_current_user
from ..database import get_db
from ..models import User as UserModel
from ..utils.storage import save_file
from ..utils.encryption import decrypt_to_bytes


router = APIRouter(prefix="/files", tags=["files"])


@router.post("/upload", response_model=schemas.FileOut, status_code=status.HTTP_201_CREATED)
def upload_file(
    file: UploadFile = File(...),
    is_public: bool = Form(False),
    share_with: List[str] = Form(default=[]),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    if not file.filename:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="Filename is required")

    file_path, file_size = save_file(file, current_user.id)

    db_file = crud.create_file_for_user(
        db,
        owner_id=current_user.id,
        filename=file.filename,
        file_path=file_path,
        file_size=file_size,
        is_public=is_public,
    )

    if share_with:
        crud.share_file_with_users(db, db_file, share_with)

    return db_file


@router.get("/", response_model=list[schemas.FileOut])
def list_my_files(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    files = db.query(crud.models.File).filter(crud.models.File.owner_id == current_user.id).all()
    return files


@router.get("/shared-with-me", response_model=list[schemas.FileOut])
def list_shared_with_me(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
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
    current_user: UserModel = Depends(get_current_user),
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
    current_user: UserModel = Depends(get_current_user),
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
    current_user: UserModel = Depends(get_current_user),
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
    current_user: UserModel = Depends(get_current_user),
):
    """Grant access to a file for a list of user emails. Owner only."""
    file_obj = db.query(models.File).filter(
        models.File.id == file_id,
        models.File.owner_id == current_user.id,
    ).first()
    if not file_obj:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")

    crud.share_file_with_users(db, file_obj, body.emails)
    return {"detail": "Shared successfully"}


@router.delete("/{file_id}/share/{user_id}", status_code=status.HTTP_200_OK)
def revoke_file_share(
    file_id: int,
    user_id: int,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
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
