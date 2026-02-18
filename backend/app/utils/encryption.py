import os
from hashlib import sha256
from typing import BinaryIO

from cryptography.hazmat.backends import default_backend
from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

from ..config import MASTER_KEY


def _derive_aes_key() -> bytes:
    """
    Derive a 256-bit AES key from the MASTER_KEY string.

    We hash the MASTER_KEY with SHA-256 so you can use any reasonably
    strong secret string in the environment without worrying about
    exact length/encoding.
    """
    return sha256(MASTER_KEY.encode("utf-8")).digest()


_AES_KEY = _derive_aes_key()


def encrypt_stream(in_file: BinaryIO, out_file: BinaryIO, chunk_size: int = 1024 * 1024) -> int:
    """
    Encrypt data from in_file to out_file using AES-256-GCM.

    File format on disk:
      [12-byte nonce][ciphertext...][16-byte GCM tag]

    Returns the number of plaintext bytes processed.
    """
    from cryptography.hazmat.primitives.ciphers import Cipher, algorithms, modes

    nonce = os.urandom(12)  # GCM standard nonce size

    cipher = Cipher(algorithms.AES(_AES_KEY), modes.GCM(nonce), backend=default_backend())
    encryptor = cipher.encryptor()

    # Write nonce first
    out_file.write(nonce)

    total_plain = 0
    while True:
        chunk = in_file.read(chunk_size)
        if not chunk:
            break
        total_plain += len(chunk)
        ct = encryptor.update(chunk)
        if ct:
            out_file.write(ct)

    encryptor.finalize()

    # Write authentication tag at the end
    out_file.write(encryptor.tag)

    return total_plain


def decrypt_to_bytes(encrypted_file: BinaryIO) -> bytes:
    """
    Decrypt an entire encrypted file (as written by encrypt_stream)
    and return the plaintext bytes.

    This reads the whole file into memory; for very large files you may
    want to implement a streaming decrypt variant later.
    """
    data = encrypted_file.read()
    if len(data) < 12 + 16:
        raise ValueError("Encrypted file too short to contain nonce and tag")

    nonce = data[:12]
    tag = data[-16:]
    ciphertext = data[12:-16]

    cipher = Cipher(algorithms.AES(_AES_KEY), modes.GCM(nonce, tag), backend=default_backend())
    decryptor = cipher.decryptor()
    plaintext = decryptor.update(ciphertext) + decryptor.finalize()
    return plaintext



