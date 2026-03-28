"""FastAPI dependencies for auth."""

from fastapi import Depends, HTTPException
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer

from db import database as db_module
from src.auth.jwt_utils import decode_token

bearer_scheme = HTTPBearer(auto_error=False)


def get_current_user(
    credentials: HTTPAuthorizationCredentials | None = Depends(bearer_scheme),
) -> dict:
    if credentials is None or credentials.scheme.lower() != "bearer":
        raise HTTPException(status_code=401, detail="Missing bearer token")

    try:
        payload = decode_token(credentials.credentials)
    except Exception as exc:
        raise HTTPException(status_code=401, detail="Invalid or expired token") from exc

    token_type = payload.get("type")
    user_id = payload.get("sub")
    if token_type != "access" or not user_id:
        raise HTTPException(status_code=401, detail="Invalid access token")

    get_user_by_id = getattr(db_module, "get_user_by_id", None)
    if not callable(get_user_by_id):
        raise HTTPException(
            status_code=503,
            detail="Auth DB functions are not ready. Discuss with Magzhan team first.",
        )

    user = get_user_by_id(user_id)
    if not user:
        raise HTTPException(status_code=401, detail="User not found")

    return user
