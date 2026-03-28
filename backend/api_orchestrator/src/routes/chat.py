"""Chat session & message routes."""

import uuid
import traceback
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from pydantic import BaseModel, Field

from db import database as db_module
from src.auth.dependencies import get_current_user
from src.config import get_settings
from src.llm.client import generate_answer, generate_chat_title
from src.utils.error_logger import log_error

router = APIRouter(prefix="/api/v1/chat", tags=["Chat"])
settings = get_settings()


class CreateSessionRequest(BaseModel):
    channel: str | None = None
    locale: str | None = None


class SendMessageRequest(BaseModel):
    text: str


class Message(BaseModel):
    id: str
    role: str
    content: str
    created_at: str


class SessionSummary(BaseModel):
    id: str
    title: str | None = None
    created_at: str | None = None
    updated_at: str | None = None


class SessionResponse(BaseModel):
    id: str
    user_id: str
    title: str | None = None
    status: str
    knowledge_version: str
    created_at: str | None = None


class SessionDetailResponse(SessionResponse):
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


def _require_db_func(name: str):
    fn = getattr(db_module, name, None)
    if not callable(fn):
        raise HTTPException(
            status_code=503,
            detail=f"Missing DB dependency '{name}'. Discuss with Magzhan team first.",
        )
    return fn


def _assert_session_owner(session: dict, user_id: str):
    owner_id = session.get("user_id")
    if owner_id is None:
        raise HTTPException(
            status_code=503,
            detail="Session ownership fields are not ready in DB. Discuss with Magzhan team first.",
        )
    if owner_id != user_id:
        raise HTTPException(status_code=403, detail="Session belongs to another user")


def _set_title_async(session_id: str, first_user_message: str):
    try:
        update_session_title = getattr(db_module, "update_session_title", None)
        if not callable(update_session_title):
            return
        title = generate_chat_title(first_user_message)
        if title:
            update_session_title(session_id, title)
    except Exception:
        # Non-critical side effect.
        return


@router.get("/sessions")
def list_chat_sessions(current_user: dict = Depends(get_current_user)):
    get_sessions_by_user = _require_db_func("get_sessions_by_user")
    sessions = get_sessions_by_user(current_user["id"])
    return {
        "sessions": [
            {
                "id": s.get("id"),
                "title": s.get("title"),
                "created_at": s.get("created_at"),
                "updated_at": s.get("updated_at") or s.get("created_at"),
            }
            for s in sessions
        ]
    }


@router.post("/sessions", status_code=201, response_model=SessionResponse)
def create_chat_session(
    _body: CreateSessionRequest | None = None,
    current_user: dict = Depends(get_current_user),
):
    create_session = _require_db_func("create_session")

    session_id = str(uuid.uuid4())
    now = datetime.now(timezone.utc).isoformat()

    try:
        create_session(session_id, current_user["id"], now)
    except TypeError as exc:
        raise HTTPException(
            status_code=503,
            detail="DB session schema is old (missing user_id). Discuss with Magzhan team first.",
        ) from exc

    return {
        "id": session_id,
        "user_id": current_user["id"],
        "title": None,
        "status": "active",
        "knowledge_version": settings.knowledge_version,
        "created_at": now,
    }


@router.get(
    "/sessions/{sessionId}",
    response_model=SessionDetailResponse,
    responses={
        403: {"description": "Session belongs to another user"},
        404: {"description": "Session not found"},
    },
)
def get_chat_session(sessionId: UUID, current_user: dict = Depends(get_current_user)):
    get_session = _require_db_func("get_session")
    get_messages = _require_db_func("get_messages")

    session_id_str = str(sessionId)
    session = get_session(session_id_str)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    _assert_session_owner(session, current_user["id"])

    messages = get_messages(session_id_str)
    return {
        "id": session["id"],
        "user_id": session["user_id"],
        "title": session.get("title"),
        "status": session["status"],
        "knowledge_version": settings.knowledge_version,
        "created_at": session.get("created_at"),
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


@router.post(
    "/sessions/{sessionId}/messages",
    response_model=ChatMessageResponse,
    responses={
        403: {"description": "Session belongs to another user"},
        404: {"description": "Session not found"},
    },
)
def send_message(
    sessionId: UUID,
    body: SendMessageRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    get_session = _require_db_func("get_session")
    get_messages = _require_db_func("get_messages")
    insert_message = _require_db_func("insert_message")

    session_id_str = str(sessionId)
    session = get_session(session_id_str)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    _assert_session_owner(session, current_user["id"])

    now = datetime.now(timezone.utc).isoformat()

    try:
        existing_messages = get_messages(session_id_str)
        user_message_count = sum(1 for m in existing_messages if m.get("role") == "user")

        user_msg_id = str(uuid.uuid4())
        insert_message(user_msg_id, session_id_str, "user", body.text, now)

        history = [
            {"role": m["role"], "content": m["content"]}
            for m in get_messages(session_id_str)
            if m.get("role") in {"user", "assistant", "system"}
        ]
        llm_output = generate_answer(history=history, rag_articles=[], rules_result={"obligations": []})

        assistant_msg_id = str(uuid.uuid4())
        answer_text = llm_output["answer_text"]
        insert_message(assistant_msg_id, session_id_str, "assistant", answer_text, now)

        if user_message_count == 0:
            background_tasks.add_task(_set_title_async, session_id_str, body.text)

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
    except HTTPException:
        raise
    except Exception as exc:
        log_error(
            user_id=current_user.get("id"),
            session_id=session_id_str,
            error_type=type(exc).__name__,
            message=str(exc),
            stack=traceback.format_exc(),
        )
        raise HTTPException(status_code=500, detail="Internal server error") from exc
