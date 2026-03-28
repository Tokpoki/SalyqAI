"""Feedback routes."""

from typing import Literal
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

router = APIRouter(prefix="/api/v1")


class FeedbackRequest(BaseModel):
    session_id: UUID
    message_id: UUID
    rating: Literal["up", "down"]
    reason: str | None = None


@router.post("/feedback", status_code=201)
def save_feedback(body: FeedbackRequest):
    raise HTTPException(
        status_code=501,
        detail="Feedback storage is not available yet. Waiting for feedback table.",
    )
