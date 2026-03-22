from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from ..database import get_db
from ..models import User, File, Folder
from ..auth import get_current_verified_user
from ..schemas import UserOut, FileOut, FolderOut
router = APIRouter(prefix="/agent", tags=["agent"])

@router.get("/list-users", response_model=list[UserOut])
def list_users(db: Session = Depends(get_db), current_user: User = Depends(get_current_verified_user)):
    return db.query(User).all()

@router.get("/user_by_email", response_model=UserOut)
def user_by_email(email: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_verified_user)):
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="User not found")
    return user

@router.get("/file_by_name", response_model=FileOut)
def file_by_name(file_name: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_verified_user)):
    file = db.query(File).filter(File.filename == file_name).first()
    if not file:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="File not found")
    return file

@router.get("/folder_by_name", response_model=FolderOut)
def folder_by_name(folder_name: str, db: Session = Depends(get_db), current_user: User = Depends(get_current_verified_user)):
    folder = db.query(Folder).filter(Folder.name == folder_name).first()
    if not folder:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Folder not found")
    return folder