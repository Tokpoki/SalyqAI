"""Chat session & message routes."""

import uuid
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, Field

from db.database import create_session, get_session, insert_message, get_messages
from src.config import get_settings
from src.llm.client import generate_answer

router = APIRouter(prefix="/api/v1/chat")
settings = get_settings()


class SendMessageRequest(BaseModel):
    text: str


class Message(BaseModel):
    id: str
    role: str
    content: str
    created_at: str


class SessionResponse(BaseModel):
    id: str
    status: str
    knowledge_version: str
    created_at: str | None = None


class SessionDetailResponse(SessionResponse):
    profile: dict | None = None
    messages: list[Message] = Field(default_factory=list)


class ChatMessageResponse(BaseModel):
    class Obligation(BaseModel):
        code: str | None = None
        title: str | None = None
        due_date_rule: str | None = None
        amount_kzt: float | None = None
        basis: str | None = None

    class Citation(BaseModel):
        article_number: str | None = None
        article_title: str | None = None
        snippet: str | None = None

    message_id: str
    answer_text: str
    action_plan: list[str] = Field(default_factory=list)
    obligations: list[Obligation] = Field(default_factory=list)
    clarifying_questions: list[str] = Field(default_factory=list)
    citations: list[Citation] = Field(default_factory=list)
    confidence: float
    disclaimer: str


# ── POST /api/v1/chat/sessions ───────────────────────────────────

@router.post("/sessions", status_code=201, response_model=SessionResponse)
def create_chat_session():
    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()
    create_session(session_id, now)
    return {
        "id": session_id,
        "status": "active",
        "knowledge_version": settings.knowledge_version,
        "created_at": now,
    }


# ── GET /api/v1/chat/sessions/{sessionId} ────────────────────────

@router.get("/sessions/{sessionId}", response_model=SessionDetailResponse)
def get_chat_session(sessionId: UUID):
    session_id_str = str(sessionId)
    session = get_session(session_id_str)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    messages = get_messages(session_id_str)
    return {
        "id": session["id"],
        "status": session["status"],
        "knowledge_version": settings.knowledge_version,
        "created_at": session["created_at"],
        "profile": None,
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

@router.post("/sessions/{sessionId}/messages", response_model=ChatMessageResponse)
def send_message(sessionId: UUID, body: SendMessageRequest):
    session_id_str = str(sessionId)
    session = get_session(session_id_str)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    now = datetime.now(timezone.utc).isoformat()

    # Save user message
    user_msg_id = str(uuid.uuid4())
    insert_message(user_msg_id, session_id_str, "user", body.text, now)

    # Build LLM context from current session history
    history = [
        {"role": m["role"], "content": m["content"]}
        for m in get_messages(session_id_str)
        if m.get("role") in {"user", "assistant", "system"}
    ]
    llm_output = generate_answer(history=history, rag_articles=[], rules_result={"obligations": []})

    # Save assistant response
    assistant_msg_id = str(uuid.uuid4())
    answer_text = llm_output["answer_text"]
    insert_message(assistant_msg_id, session_id_str, "assistant", answer_text, now)

    return {
        "message_id": assistant_msg_id,
        "answer_text": answer_text,
        "action_plan": llm_output["action_plan"],
        "obligations": llm_output["obligations"],
        "clarifying_questions": llm_output["clarifying_questions"],
        "citations": llm_output["citations"],
        "confidence": llm_output["confidence"],
        "disclaimer": llm_output["disclaimer"],
    }
