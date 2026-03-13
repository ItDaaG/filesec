from typing import Optional, List, Dict

from sqlalchemy.orm import Session

from . import models
from .schemas import UserCreate
from .utils.security import get_password_hash


# --- USER HELPERS ---

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    normalized = email.strip().lower()
    return db.query(models.User).filter(models.User.email == normalized).first()


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def create_user(db: Session, user_in: UserCreate) -> models.User:
    hashed_password = get_password_hash(user_in.password)
    db_user = models.User(
        username=user_in.username,
        email=user_in.email.strip().lower(),
        password_hash=hashed_password,
    )
    db.add(db_user)
    db.commit()
    db.refresh(db_user)
    return db_user


def delete_user(db: Session, user: models.User) -> None:
    db.delete(user)
    db.commit()


# --- FILE HELPERS ---

def create_file_for_user(
    db: Session,
    *,
    owner_id: int,
    filename: str,
    file_path: str,
    file_size: int,
    is_public: bool = False,
    folder_id: Optional[int] = None,
) -> models.File:
    db_file = models.File(
        filename=filename,
        file_path=file_path,
        file_size=file_size,
        is_public=is_public,
        owner_id=owner_id,
        folder_id=folder_id,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


# --- FILE PERMISSION HELPERS ---

def share_file_with_users(db: Session, file: models.File, emails: List[str]) -> Dict[str, List[str]]:
    """
    Grant access to a file for each email in the list.
    - Skips emails that don't match any user.
    - Skips the file owner (they already have access).
    - Idempotent: won't create duplicate FilePermission rows.

    Returns a structured result describing what happened for each email:
    {
        "owner": <bool>,
        "shared": [...],
        "already_shared": [...],
        "not_found": [...]
    }
    """
    result: Dict[str, List[str]] = {
        "owner": False,
        "shared": [],
        "already_shared": [],
        "not_found": [],
    }

    for email in emails:
        normalized_email = email.strip().lower()
        target = get_user_by_email(db, normalized_email)

        if target is None:
            result["not_found"].append(normalized_email)
            continue

        if target.id == file.owner_id:
            result["owner"] = True
            continue 

        exists = db.query(models.FilePermission).filter(
            models.FilePermission.file_id == file.id,
            models.FilePermission.user_id == target.id,
        ).first()
        if not exists:
            db.add(models.FilePermission(file_id=file.id, user_id=target.id))
            result["shared"].append(normalized_email)
        else:
            result["already_shared"].append(normalized_email)

    db.commit()
    return result


def revoke_file_share(db: Session, file: models.File, user_id: int) -> bool:
    """
    Revoke a specific user's access to a file.
    Returns True if a permission was removed, False if it didn't exist.
    """
    permission = db.query(models.FilePermission).filter(
        models.FilePermission.file_id == file.id,
        models.FilePermission.user_id == user_id,
    ).first()
    if not permission:
        return False
    db.delete(permission)
    db.commit()
    return True


# --- FOLDER HELPERS ---

def create_folder(
    db: Session,
    *,
    owner_id: int,
    name: str,
    parent_id: Optional[int] = None,
) -> models.Folder:
    db_folder = models.Folder(
        name=name,
        owner_id=owner_id,
        parent_id=parent_id,
    )
    db.add(db_folder)
    db.commit()
    db.refresh(db_folder)
    return db_folder


def get_folder_by_id(db: Session, folder_id: int) -> Optional[models.Folder]:
    return db.query(models.Folder).filter(models.Folder.id == folder_id).first()


def list_folders_for_user(
    db: Session,
    owner_id: int,
    parent_id: Optional[int] = None,
) -> List[models.Folder]:
    """
    List folders owned by a user.
    - parent_id=None  → top-level folders (no parent).
    - parent_id=<int> → children of that folder.
    """
    query = db.query(models.Folder).filter(models.Folder.owner_id == owner_id)
    if parent_id is None:
        query = query.filter(models.Folder.parent_id.is_(None))
    else:
        query = query.filter(models.Folder.parent_id == parent_id)
    return query.all()


def rename_folder(db: Session, folder: models.Folder, new_name: str) -> models.Folder:
    folder.name = new_name
    db.commit()
    db.refresh(folder)
    return folder


def delete_folder(db: Session, folder: models.Folder) -> None:
    """
    Recursively deletes a folder and all its children/files.
    SQLAlchemy cascade="all, delete-orphan" handles the child rows.
    """
    db.delete(folder)
    db.commit()


def move_file_to_folder(
    db: Session, file: models.File, folder_id: Optional[int] = None
) -> models.File:
    """Move a file into a folder (or back to root if folder_id is None)."""
    file.folder_id = folder_id
    db.commit()
    db.refresh(file)
    return file
