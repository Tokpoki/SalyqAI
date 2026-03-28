"""Profile routes for chat sessions."""

from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
from typing import Literal

from db.database import get_session

router = APIRouter(prefix="/api/v1/chat")


class ProfilePatchRequest(BaseModel):
    taxpayer_type: Literal["individual", "sole_proprietor", "legal_entity"] | None = None
    tax_regime: str | None = None
    annual_income_kzt: float | None = None
    employees_count: int | None = None
    activity_type: str | None = None
    has_foreign_income: bool | None = None
    has_rental_income: bool | None = None
    residency_status: Literal["resident", "non_resident"] | None = None


@router.patch("/sessions/{sessionId}/profile")
def patch_profile(sessionId: UUID, body: ProfilePatchRequest):
    session = get_session(str(sessionId))
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    raise HTTPException(
        status_code=501,
        detail="Profile storage is not available yet. Waiting for taxpayer_profiles table.",
    )
