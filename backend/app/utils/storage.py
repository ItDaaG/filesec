from pathlib import Path
from typing import Tuple

from fastapi import UploadFile

from .encryption import encrypt_stream


UPLOAD_ROOT = Path("uploads")


def save_file(file: UploadFile, user_id: int) -> Tuple[str, int]:
    """
    Save an uploaded file to local disk under uploads/{user_id}/
    with server-side encryption and return (file_path, file_size).

    - Only the file contents are encrypted, not the DB metadata.
    - file_path is stored as a string relative to the backend root
      so it's easy to swap to real storage later.
    """
    user_dir = UPLOAD_ROOT / str(user_id)
    user_dir.mkdir(parents=True, exist_ok=True)

    destination = user_dir / file.filename

    with destination.open("wb") as out_file:
        size = encrypt_stream(file.file, out_file)

    # Store path as POSIX-style relative string and the original plaintext size
    return str(destination.as_posix()), size

