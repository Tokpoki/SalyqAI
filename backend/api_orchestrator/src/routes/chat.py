"""Chat session & message routes."""

import uuid
from datetime import datetime, timezone
from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from db.database import create_session, get_session, insert_message, get_messages

router = APIRouter(prefix="/api/v1/chat")


class SendMessageRequest(BaseModel):
    text: str


# ── POST /api/v1/chat/sessions ───────────────────────────────────

@router.post("/sessions", status_code=201)
def create_chat_session():
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    create_session(session_id, now)
    return {"id": session_id, "status": "active"}


# ── GET /api/v1/chat/sessions/{sessionId} ────────────────────────

@router.get("/sessions/{session_id}")
def get_chat_session(session_id: str):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = get_messages(session_id)
    return {
        "id": session["id"],
        "status": session["status"],
        "created_at": session["created_at"],
        "messages": [
            {
                "id": m["id"],
                "role": m["role"],
                "content": m["content"],
                "created_at": m["created_at"],
            }
            for m in messages
        ],
    }


# ── POST /api/v1/chat/sessions/{sessionId}/messages ──────────────

@router.post("/sessions/{session_id}/messages")
def send_message(session_id: str, body: SendMessageRequest):
    session = get_session(session_id)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = datetime.now(timezone.utc).isoformat()

    # Save user message
    user_msg_id = str(uuid.uuid4())
    insert_message(user_msg_id, session_id, "user", body.text, now)

    # Generate stub assistant response
    assistant_msg_id = str(uuid.uuid4())
    answer_text = f"[Demo] Вы спросили: «{body.text}». Это заглушка — реальный ответ будет после интеграции RAG + Rules."
    insert_message(assistant_msg_id, session_id, "assistant", answer_text, now)

    return {
        "message_id": assistant_msg_id,
        "answer_text": answer_text,
        "action_plan": ["Demo step 1", "Demo step 2"],
        "obligations": [],
        "clarifying_questions": [],
        "citations": [],
        "confidence": 0.5,
        "disclaimer": "Demo response",
    }
