"""JWT utility functions."""

from datetime import datetime, timedelta, timezone

import jwt

from src.config import get_settings


def _create_token(user_id: str, token_type: str, ttl: timedelta) -> str:
    settings = get_settings()
    payload = {
        "sub": user_id,
        "type": token_type,
        "exp": datetime.now(timezone.utc) + ttl,
        "iat": datetime.now(timezone.utc),
    }
    return jwt.encode(payload, settings.jwt_secret, algorithm="HS256")


def create_access_token(user_id: str) -> str:
    settings = get_settings()
    return _create_token(
        user_id=user_id,
        token_type="access",
        ttl=timedelta(minutes=settings.jwt_access_expire_minutes),
    )


def create_refresh_token(user_id: str) -> str:
    settings = get_settings()
    return _create_token(
        user_id=user_id,
        token_type="refresh",
        ttl=timedelta(days=settings.jwt_refresh_expire_days),
    )


def decode_token(token: str) -> dict:
    settings = get_settings()
    return jwt.decode(token, settings.jwt_secret, algorithms=["HS256"])
