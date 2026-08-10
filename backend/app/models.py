import uuid
from sqlalchemy import Column, Integer, String, Boolean, ForeignKey, DateTime, UniqueConstraint, Text, LargeBinary
from sqlalchemy.dialects.postgresql import UUID as PgUUID
from sqlalchemy.orm import relationship
from sqlalchemy.sql import func
from pgvector.sqlalchemy import Vector

from .database import Base


class User(Base):
    __tablename__ = "users"

    id = Column(Integer, primary_key=True, index=True)
    username = Column(String(50), unique=True, index=True, nullable=False)
    email = Column(String(100), unique=True, index=True, nullable=False)
    password_hash = Column(String(255), nullable=False)
    account_tier = Column(String(20), default="standard", nullable=False)  # standard, pro, pro+
    storage_used_bytes = Column(Integer, default=0, nullable=False, server_default="0")
    is_email_verified = Column(Boolean, default=False, nullable=False, server_default="false")
    created_at = Column(DateTime(timezone=True), server_default=func.now())

    # Relationships
    owned_files = relationship("File", back_populates="owner")
    owned_folders = relationship("Folder", back_populates="owner")
    shared_with_me = relationship("FilePermission", back_populates="user")
    shared_folders_with_me = relationship("FolderPermission", back_populates="user")
    email_tokens = relationship("EmailToken", back_populates="user", cascade="all, delete-orphan")


class EmailToken(Base):
    """
    Unified token table for email verification, password reset, and email
    change flows.  Tokens are stored as SHA-256 hashes; the raw UUID is sent
    only via email and never persisted in plain text.
    """
    __tablename__ = "email_tokens"

    id = Column(Integer, primary_key=True, index=True)
    token_hash = Column(String(64), unique=True, index=True, nullable=False)
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    # Values: "email_verification" | "password_reset" | "email_change"
    token_type = Column(String(30), nullable=False)
    # payload stores the pending new email for email_change; null otherwise
    payload = Column(String(255), nullable=True)
    expires_at = Column(DateTime(timezone=True), nullable=False)
    used_at = Column(DateTime(timezone=True), nullable=True)

    user = relationship("User", back_populates="email_tokens")


class Folder(Base):
    __tablename__ = "folders"

    id = Column(PgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    name = Column(String(255), nullable=False)
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"), nullable=False)
    parent_id = Column(PgUUID(as_uuid=True), ForeignKey("folders.id", ondelete="CASCADE"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), server_default=func.now(), onupdate=func.now())

    # Relationships
    owner = relationship("User", back_populates="owned_folders")
    parent = relationship("Folder", back_populates="children", remote_side=[id])
    children = relationship("Folder", back_populates="parent", cascade="all, delete-orphan")
    files = relationship("File", back_populates="folder", cascade="all, delete-orphan")
    shared_with = relationship("FolderPermission", back_populates="folder", cascade="all, delete-orphan")


class File(Base):
    __tablename__ = "files"

    id = Column(PgUUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    filename = Column(String(255), nullable=False)
    mime_type = Column(String(255), nullable=True)
    file_path = Column(String(500), nullable=False)  # Path to actual storage
    file_size = Column(Integer)  # In bytes
    is_public = Column(Boolean, default=False)  # "Openly" shared
    owner_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))
    folder_id = Column(PgUUID(as_uuid=True), ForeignKey("folders.id", ondelete="SET NULL"), nullable=True)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    # PDF chunk embeddings: pending | indexed | failed | skipped (see app.services.pdf_embeddings)
    embedding_status = Column(String(32), nullable=True)

    # Relationships
    owner = relationship("User", back_populates="owned_files")
    folder = relationship("Folder", back_populates="files")
    shared_with = relationship("FilePermission", back_populates="file", cascade="all, delete-orphan")


class FileEmbeddingChunk(Base):
    """Chunk-level vectors for semantic search (pgvector). Rows removed when the file is deleted."""

    __tablename__ = "file_embedding_chunks"
    __table_args__ = (
        UniqueConstraint("file_id", "chunk_index", name="uq_file_embedding_chunk_idx"),
    )

    id = Column(Integer, primary_key=True, autoincrement=True)
    file_id = Column(PgUUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"), nullable=False, index=True)
    chunk_index = Column(Integer, nullable=False)
    embedding = Column(Vector(768), nullable=False)
    content_ciphertext = Column(LargeBinary, nullable=True)


class FilePermission(Base):
    """Handles sharing files with specific users"""
    __tablename__ = "file_permissions"
    __table_args__ = (UniqueConstraint("file_id", "user_id", name="uq_file_user"),)

    id = Column(Integer, primary_key=True, index=True)
    file_id = Column(PgUUID(as_uuid=True), ForeignKey("files.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    file = relationship("File", back_populates="shared_with")
    user = relationship("User", back_populates="shared_with_me")


class FolderPermission(Base):
    """Handles sharing folders with specific users"""
    __tablename__ = "folder_permissions"
    __table_args__ = (UniqueConstraint("folder_id", "user_id", name="uq_folder_user"),)

    id = Column(Integer, primary_key=True, index=True)
    folder_id = Column(PgUUID(as_uuid=True), ForeignKey("folders.id", ondelete="CASCADE"))
    user_id = Column(Integer, ForeignKey("users.id", ondelete="CASCADE"))

    folder = relationship("Folder", back_populates="shared_with")
    user = relationship("User", back_populates="shared_folders_with_me")
