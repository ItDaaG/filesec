from typing import Optional, List

from sqlalchemy.orm import Session

from . import models
from .schemas import UserCreate
from .utils.security import get_password_hash


# --- USER HELPERS ---

def get_user_by_email(db: Session, email: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.email == email).first()


def get_user_by_username(db: Session, username: str) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.username == username).first()


def get_user_by_id(db: Session, user_id: int) -> Optional[models.User]:
    return db.query(models.User).filter(models.User.id == user_id).first()


def create_user(db: Session, user_in: UserCreate) -> models.User:
    hashed_password = get_password_hash(user_in.password)
    db_user = models.User(
        username=user_in.username,
        email=user_in.email,
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
) -> models.File:
    db_file = models.File(
        filename=filename,
        file_path=file_path,
        file_size=file_size,
        is_public=is_public,
        owner_id=owner_id,
    )
    db.add(db_file)
    db.commit()
    db.refresh(db_file)
    return db_file


# --- FILE PERMISSION HELPERS ---

def share_file_with_users(db: Session, file: models.File, emails: List[str]) -> None:
    """
    Grant access to a file for each email in the list.
    - Skips emails that don't match any user.
    - Skips the file owner (they already have access).
    - Idempotent: won't create duplicate FilePermission rows.
    """
    for email in emails:
        target = get_user_by_email(db, email)
        if target is None or target.id == file.owner_id:
            continue
        exists = db.query(models.FilePermission).filter(
            models.FilePermission.file_id == file.id,
            models.FilePermission.user_id == target.id,
        ).first()
        if not exists:
            db.add(models.FilePermission(file_id=file.id, user_id=target.id))
    db.commit()


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
