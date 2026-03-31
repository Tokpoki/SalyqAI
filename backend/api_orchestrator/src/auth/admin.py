"""Admin-only FastAPI dependency."""

from fastapi import Depends, HTTPException

from src.auth.dependencies import get_current_user
from src.config import get_settings


def get_admin_user(current_user: dict = Depends(get_current_user)) -> dict:
    admin_emails = get_settings().admin_emails
    if not admin_emails:
        raise HTTPException(status_code=403, detail="Admin access is not configured")
    if current_user.get("email", "").lower() not in admin_emails:
        raise HTTPException(status_code=403, detail="Admin access required")
    return current_user
