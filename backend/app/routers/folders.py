from typing import Optional
from uuid import UUID

from fastapi import APIRouter, Depends, HTTPException, Query, status
from sqlalchemy.orm import Session

from .. import schemas, crud
from ..auth import get_current_verified_user, get_verified_user_or_agent_user
from ..database import get_db
from ..models import User as UserModel


router = APIRouter(prefix="/folders", tags=["folders"])


@router.post("/", response_model=schemas.FolderOut, status_code=status.HTTP_201_CREATED)
def create_folder(
    body: schemas.FolderCreate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_verified_user_or_agent_user),
):
    """Create a new folder. Optionally nest it inside a parent folder."""
    # If parent_id provided, verify it exists and belongs to the user
    if body.parent_id is not None:
        parent = crud.get_folder_by_id(db, body.parent_id)
        if not parent or parent.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Parent folder not found",
            )

    folder = crud.create_folder(
        db,
        owner_id=current_user.id,
        name=body.name,
        parent_id=body.parent_id,
    )
    return folder


@router.get("/", response_model=list[schemas.FolderOut])
def list_folders(
    parent_id: Optional[UUID] = Query(None, description="Get children of this folder. Omit for top-level."),
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_verified_user_or_agent_user),
):
    """
    List folders for the current user.
    - Omit parent_id → top-level folders.
    - Provide parent_id → children of that folder.
    """
    return crud.list_folders_for_user(db, owner_id=current_user.id, parent_id=parent_id)


@router.get("/{folder_id}", response_model=schemas.FolderOut)
def get_folder(
    folder_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
):
    folder = crud.get_folder_by_id(db, folder_id)
    if not folder or folder.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return folder


@router.patch("/{folder_id}", response_model=schemas.FolderOut)
def update_folder(
    folder_id: UUID,
    body: schemas.FolderUpdate,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_verified_user_or_agent_user),
):
    """Rename a folder or move it to a different parent."""
    folder = crud.get_folder_by_id(db, folder_id)
    if not folder or folder.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    if body.name is not None:
        folder = crud.rename_folder(db, folder, body.name)

    if body.parent_id is not None:
        # Prevent moving a folder into itself
        if body.parent_id == folder_id:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot move a folder into itself",
            )
        parent = crud.get_folder_by_id(db, body.parent_id)
        if not parent or parent.owner_id != current_user.id:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Target parent folder not found",
            )
        folder.parent_id = body.parent_id
        db.commit()
        db.refresh(folder)

    return folder


@router.delete("/{folder_id}", status_code=status.HTTP_204_NO_CONTENT)
def delete_folder(
    folder_id: UUID,
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
):
    """
    Recursively delete a folder and all its children/files.
    Physical files on disk are also removed.
    """
    import os
    from pathlib import Path

    folder = crud.get_folder_by_id(db, folder_id)
    if not folder or folder.owner_id != current_user.id:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")

    # Collect all files in this folder tree so we can remove them from disk
    def collect_files(f):
        """Recursively collect all File objects under a folder."""
        all_files = list(f.files)
        for child in f.children:
            all_files.extend(collect_files(child))
        return all_files

    files_in_tree = collect_files(folder)
    total_size = sum(f.file_size or 0 for f in files_in_tree)

    for file_obj in files_in_tree:
        try:
            path = Path(file_obj.file_path)
            if not path.is_absolute():
                base_dir = Path(__file__).resolve().parents[2]
                path = base_dir / file_obj.file_path
            if path.exists():
                os.remove(path)
        except Exception:
            pass  # Don't block deletion if file already missing

    # Decrement storage counter for all files removed
    current_user.storage_used_bytes = max(0, (current_user.storage_used_bytes or 0) - total_size)

    # SQLAlchemy cascade handles child folders + files + permissions in DB
    crud.delete_folder(db, folder)
