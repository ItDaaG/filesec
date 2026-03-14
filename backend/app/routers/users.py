from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import schemas, crud
from ..database import get_db
from ..auth import get_current_user, authenticate_user
from ..models import User as UserModel
from ..utils.security import create_access_token
from ..utils.storage_limits import get_storage_limit_bytes

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=schemas.AuthResponse, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    if crud.get_user_by_email(db, email=user_in.email):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Email already registered",
        )
    if crud.get_user_by_username(db, username=user_in.username):
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Username already taken",
        )
    user = crud.create_user(db, user_in)
    access_token = create_access_token(data={"sub": str(user.id)})
    return {"access_token": access_token, "token_type": "bearer", "user": user}


@router.get("/me", response_model=schemas.UserOut)
def read_current_user(current_user: UserModel = Depends(get_current_user)):
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_user),
):
    crud.delete_user(db, current_user)
    return None


@router.get("/me/storage-stats", response_model=schemas.StorageStats)
def get_storage_stats(
    current_user: UserModel = Depends(get_current_user),
):
    """Get storage usage statistics for the current user."""
    storage_limit = get_storage_limit_bytes(current_user.account_tier)
    total_used = current_user.storage_used_bytes or 0
    storage_percentage = (total_used / storage_limit * 100) if storage_limit > 0 else 0.0

    return {
        "storage_used_bytes": total_used,
        "storage_limit_bytes": storage_limit,
        "storage_used_percentage": round(storage_percentage, 2),
        "account_tier": current_user.account_tier,
    }

