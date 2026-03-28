"""Profile routes bound to current user."""

from typing import Literal

from fastapi import APIRouter, Depends, HTTPException
from pydantic import BaseModel

from db import database as db_module
from src.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1/user", tags=["Profile"])


class ProfilePatchRequest(BaseModel):
    taxpayer_type: Literal["individual", "sole_proprietor", "legal_entity"] | None = None
    tax_regime: str | None = None
    annual_income_kzt: float | None = None
    employees_count: int | None = None
    activity_type: str | None = None
    has_foreign_income: bool | None = None
    has_rental_income: bool | None = None
    residency_status: Literal["resident", "non_resident"] | None = None


def _require_db_func(name: str):
    fn = getattr(db_module, name, None)
    if not callable(fn):
        raise HTTPException(
            status_code=503,
            detail=f"Missing DB dependency '{name}'. Discuss with Magzhan team first.",
        )
    return fn


@router.get("/profile")
def get_profile(current_user: dict = Depends(get_current_user)):
    get_or_create_profile_by_user = _require_db_func("get_or_create_profile_by_user")
    return get_or_create_profile_by_user(current_user["id"])


@router.patch("/profile")
def patch_profile(body: ProfilePatchRequest, current_user: dict = Depends(get_current_user)):
    update_profile_by_user = _require_db_func("update_profile_by_user")
    fields = body.model_dump(exclude_none=True)
    return update_profile_by_user(current_user["id"], fields)
