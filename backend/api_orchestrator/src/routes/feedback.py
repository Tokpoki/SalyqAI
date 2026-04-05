"""Feedback routes."""

import uuid
from datetime import datetime, timezone
from typing import Literal
from uuid import UUID

from fastapi import APIRouter, Depends
from pydantic import BaseModel

from db.database import save_feedback
from src.auth.dependencies import get_current_user

router = APIRouter(prefix="/api/v1")


class FeedbackRequest(BaseModel):
    session_id: UUID
    message_id: UUID
    rating: Literal["up", "down"]
    reason: str | None = None


@router.post("/feedback", status_code=201)
def create_feedback(body: FeedbackRequest, _: dict = Depends(get_current_user)):
    feedback_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    result = save_feedback(
        feedback_id=feedback_id,
        message_id=str(body.message_id),
        rating=body.rating,
        created_at=now,
        reason=body.reason,
    )
    return {"id": result["id"], "rating": result["rating"]}
