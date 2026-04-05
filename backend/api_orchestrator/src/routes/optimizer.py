"""Tax optimization API routes."""

from fastapi import APIRouter, Depends, HTTPException

from src.auth.dependencies import get_current_user
from src.optimizer.engine import optimize

import db.database as db_module

router = APIRouter(prefix="/api/v1/optimizer", tags=["Optimizer"])


@router.get("/analyze")
def analyze_optimization(current_user: dict = Depends(get_current_user)):
    """Analyze user's tax profile and return optimization recommendations."""
    get_profile_fn = getattr(db_module, "get_or_create_profile_by_user", None)
    if not callable(get_profile_fn):
        raise HTTPException(status_code=503, detail="Profile DB not available")

    profile = {}
    try:
        profile = get_profile_fn(current_user["id"]) or {}
    except Exception:
        pass

    profile["name"] = current_user.get("name", "")

    result = optimize(profile, year=2026)
    return result
