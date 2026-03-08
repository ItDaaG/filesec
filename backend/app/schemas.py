from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import datetime
from typing import Optional, List

# --- AUTH SCHEMAS ---
class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: "UserOut"

# --- USER SCHEMAS ---
class UserBase(BaseModel):
    username: str = Field(..., min_length=3, max_length=50)
    email: EmailStr

class UserCreate(UserBase):
    password: str = Field(..., min_length=8)

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserOut(UserBase):
    id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

# --- FILE SCHEMAS ---
class FileBase(BaseModel):
    filename: str
    is_public: bool = False

class FileCreate(FileBase):
    file_path: str
    file_size: int
    
class FileUpdate(BaseModel):
    filename: Optional[str] = None
    is_public: Optional[bool] = None

class FileOut(FileBase):
    id: int
    file_path: str
    file_size: int
    owner_id: int
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)
