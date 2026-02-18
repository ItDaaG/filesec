from fastapi import APIRouter, Depends, File, Form, UploadFile, HTTPException, status
from fastapi.responses import StreamingResponse
from sqlalchemy.orm import Session

from .. import schemas, crud
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

    return db_file


@router.get("/", response_model=list[schemas.FileOut])
def list_my_files(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    files = db.query(crud.models.File).filter(crud.models.File.owner_id == current_user.id).all()
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

    # Open and decrypt the file contents
    file_path = file_obj.file_path
    try:
        from pathlib import Path

        path = Path(file_path)
        # If stored as relative path, resolve from backend root
        if not path.is_absolute():
            # This module is in backend/app/, so go one level up
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

