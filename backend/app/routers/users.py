from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import schemas, crud
from ..auth import get_current_user, get_current_verified_user, get_verified_user_or_agent_user
from ..database import get_db
from ..models import User as UserModel
from ..utils.storage_limits import get_storage_limit_bytes

router = APIRouter(prefix="/users", tags=["users"])


@router.get("/me", response_model=schemas.UserOut)
def read_current_user(current_user: UserModel = Depends(get_current_user)):
    return current_user


@router.delete("/me", status_code=status.HTTP_204_NO_CONTENT)
def delete_current_user(
    db: Session = Depends(get_db),
    current_user: UserModel = Depends(get_current_verified_user),
):
    """Permanently delete the authenticated user and all their data."""
    crud.delete_user(db, current_user)
    return None


@router.get("/me/storage-stats", response_model=schemas.StorageStats)
def get_storage_stats(
    current_user: UserModel = Depends(get_verified_user_or_agent_user),
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