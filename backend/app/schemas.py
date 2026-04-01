from pydantic import BaseModel, EmailStr, ConfigDict, Field
from datetime import datetime
from typing import Optional, List
from uuid import UUID

# --- AUTH SCHEMAS ---

class AuthResponse(BaseModel):
    access_token: str
    token_type: str
    user: "UserOut"

class SignUpResponse(BaseModel):
    detail: str
    email: str

class TokenVerifyResponse(BaseModel):
    """
    Returned by POST /auth/verify-token.

    For email_verification and email_change, access_token + user are populated
    and the token is consumed.  For password_reset the token is only validated
    (not consumed); the caller must follow up with POST /auth/reset-password.
    """
    valid: bool
    type: Optional[str] = None          # "email_verification" | "email_change" | "password_reset"
    payload: Optional[str] = None       # new email for email_change; null otherwise
    access_token: Optional[str] = None  # set for email_verification / email_change
    token_type: Optional[str] = None    # "bearer" when access_token is present
    user: Optional["UserOut"] = None

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
    account_tier: str
    is_email_verified: bool
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class StorageStats(BaseModel):
    storage_used_bytes: int
    storage_limit_bytes: int
    storage_used_percentage: float
    account_tier: str

# --- EMAIL / TOKEN REQUEST SCHEMAS ---

class ResendVerificationRequest(BaseModel):
    email: EmailStr

class ForgotPasswordRequest(BaseModel):
    email: EmailStr

class ResetPasswordRequest(BaseModel):
    token: str
    new_password: str = Field(..., min_length=8)

class RequestEmailChangeRequest(BaseModel):
    current_password: str
    new_email: EmailStr

class VerifyTokenRequest(BaseModel):
    token: str

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
    folder_id: Optional[UUID] = None  # None = move to library root (no folder)

class FileOut(FileBase):
    id: UUID
    file_path: str
    file_size: int
    mime_type: Optional[str] = None
    owner_id: int
    folder_id: Optional[UUID] = None
    created_at: datetime
    model_config = ConfigDict(from_attributes=True)

class SharedUser(BaseModel):
    id: int
    email: str
    username: str
    model_config = ConfigDict(from_attributes=True)

# --- FOLDER SCHEMAS ---

class FolderBase(BaseModel):
    name: str = Field(..., min_length=1, max_length=255)

class FolderCreate(FolderBase):
    parent_id: Optional[UUID] = None

class FolderUpdate(BaseModel):
    name: Optional[str] = Field(None, min_length=1, max_length=255)
    parent_id: Optional[UUID] = None

class FolderOut(FolderBase):
    id: UUID
    owner_id: int
    parent_id: Optional[UUID] = None
    created_at: datetime
    updated_at: datetime
    model_config = ConfigDict(from_attributes=True)
