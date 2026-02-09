from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from .database import Base

class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owned_files = relationship("File", back_populates="owner")
    shared_with_me = relationship("FilePermission", back_populates="user")

class File(Base):
    __tablename__ = "files"

    id = Column(Integer, primary_key=True, index=True)
    filename = Column(String(255), nullable=False)
    file_path = Column(String(500), nullable=False)  # Path to actual storage
    file_size = Column(Integer) # In bytes
    is_public = Column(Boolean, default=False)  # "Openly" shared
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owner = relationship("User", back_populates="owned_files")
    shared_users = relationship("FilePermission", back_populates="file")

class FilePermission(Base):
    """
    Handles sharing files with specific users
    """
    __tablename__ = "file_permissions"

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(Integer, ForeignKey("files.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    file = relationship("File", back_populates="shared_users")
    user = relationship("User", back_populates="shared_with_me")
