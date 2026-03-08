from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from .. import schemas, crud
from ..database import get_db
from ..auth import get_current_user, authenticate_user
from ..models import User as UserModel
from ..utils.security import create_access_token

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


