"""Password hashing helpers for auth."""

import bcrypt


def hash_password(plain: str) -> str:
    raw = plain.encode("utf-8")
    hashed = bcrypt.hashpw(raw, bcrypt.gensalt())
    return hashed.decode("utf-8")


def verify_password(plain: str, hashed: str) -> bool:
    try:
        return bcrypt.checkpw(plain.encode("utf-8"), hashed.encode("utf-8"))
    except ValueError:
        return False
