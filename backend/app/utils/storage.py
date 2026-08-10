import io
from pathlib import Path
from typing import Tuple

from fastapi import UploadFile

from .encryption import encrypt_stream


UPLOAD_ROOT = Path("uploads")


def save_file(file: UploadFile, user_id: int) -> Tuple[str, int, bytes]:
    """
    Read upload once, encrypt to disk under uploads/{user_id}/, return path, plaintext size, and raw bytes.

    Callers that need the bytes (e.g. PDF embedding before any decrypt) use the third return value.
    """
    plaintext_bytes = file.file.read()
    user_dir = UPLOAD_ROOT / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)
    destination = user_dir / file.filename
    with destination.open("wb") as out_file:
        size = encrypt_stream(io.BytesIO(plaintext_bytes), out_file)
    return str(destination.as_posix()), size, plaintext_bytes
