from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import schemas, crud
from ..database import get_db
from ..auth import get_current_user
from ..models import User as UserModel

router = APIRouter(prefix="/users", tags=["users"])


@router.post("/", response_model=schemas.UserOut, status_code=status.HTTP_201_CREATED)
def create_user(
    user_in: schemas.UserCreate,
    db: Session = Depends(get_db),
):
    existing = crud.get_user_by_email(db, email=user_in.email)
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Email already registered",
        )
    return crud.create_user(db, user_in)


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


