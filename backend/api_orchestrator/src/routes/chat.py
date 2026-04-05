"""Chat session & message routes."""

import json
import uuid
import traceback
from datetime import datetime, timezone
from uuid import UUID

from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException, Request
from fastapi.responses import StreamingResponse
from pydantic import BaseModel, Field

from db import database as db_module
from src.auth.dependencies import get_current_user
from src.config import get_settings
from src.llm.client import generate_answer, generate_answer_stream, generate_chat_title
from src.utils.error_logger import log_error

import re as _re


def _rerank(query: str, articles: list[dict], top_n: int = 5) -> list[dict]:
    """Rerank articles by keyword overlap with the query (free, no external API)."""
    if len(articles) <= top_n:
        return articles

    q_lower = query.lower().replace("ё", "е")
    q_words = {w for w in q_lower.split() if len(w) > 2}
    q_bigrams = set()
    words_list = list(q_words)
    for i in range(len(words_list) - 1):
        q_bigrams.add(f"{words_list[i]} {words_list[i+1]}")

    scored = []
    for article in articles:
        text = (article.get("full_text") or article.get("snippet", "")).lower().replace("ё", "е")
        # Word overlap score
        word_hits = sum(1 for w in q_words if w in text)
        # Bigram overlap (phrase matching bonus)
        bigram_hits = sum(2 for bg in q_bigrams if bg in text)
        # Title match bonus
        title = (article.get("article_title") or "").lower().replace("ё", "е")
        title_hits = sum(3 for w in q_words if w in title)
        # Combine with original embedding score
        keyword_score = word_hits + bigram_hits + title_hits
        combined = article["score"] + keyword_score * 0.5
        scored.append((combined, article))

    scored.sort(key=lambda x: x[0], reverse=True)
    result = []
    for combined_score, article in scored[:top_n]:
        a = article.copy()
        a["score"] = combined_score
        result.append(a)
    return result


_SYNONYM_MAP = {
    "упрощенк": ["упрощен", "специальн налогов режим", "декларац"],
    "ип": ["индивидуальн предприниматель", "предприниматель"],
    "ндс": ["добавленн стоимост", "НДС"],
    "ипн": ["индивидуальн подоходн", "ИПН"],
    "кпн": ["корпоративн подоходн", "КПН"],
    "соцналог": ["социальн налог"],
    "пенсионн": ["обязательн пенсионн", "ОППВ"],
    "патент": ["патент", "специальн налогов режим"],
    "аренд": ["имущественн доход", "аренд"],
    "зарплат": ["доход работник", "оплат труд"],
    "физлиц": ["физическ лиц"],
    "юрлиц": ["юридическ лиц"],
    "штраф": ["штраф", "взыскан", "правонарушен", "административн"],
    "пен": ["пеня", "просрочк", "несвоевременн"],
    "несдач": ["несвоевременн", "непредставлен", "декларац", "отчёт"],
    "нарушен": ["правонарушен", "административн", "штраф", "взыскан"],
    "пдд": ["дорожн движен", "правил дорожн", "транспортн средств"],
    "переход": ["пешеход", "переход дорог", "нарушен пешеход"],
    "скорост": ["превышен скорост", "ограничен скорост", "дорожн движен"],
    "алкогол": ["нетрезв состоян", "опьянен", "алкогольн"],
    "парковк": ["стоянк", "остановк", "парковк"],
}


def _extract_article_numbers(query: str) -> list[str]:
    """Extract article numbers from queries like 'статья 8', 'ст. 492', 'ст.492-494'."""
    import re
    pattern = r'(?:стать[яюией]+|ст\.?)\s*(\d+(?:\s*[-–]\s*\d+)?)'
    matches = re.findall(pattern, query.lower())
    numbers = []
    for m in matches:
        if '-' in m or '–' in m:
            parts = re.split(r'\s*[-–]\s*', m)
            numbers.extend(parts)
        else:
            numbers.append(m.strip())
    return numbers


def _expand_query_terms(query: str) -> list[str]:
    """Expand user query into formal legal terms for better retrieval."""
    q_lower = query.lower().replace("ё", "е")
    terms = []

    for colloquial, formal_list in _SYNONYM_MAP.items():
        if colloquial in q_lower:
            for formal in formal_list:
                terms.extend(formal.split())

    words = q_lower.split()
    for w in words:
        if len(w) > 3 or w.isdigit():
            terms.append(w.replace("ё", "е"))

    return list(dict.fromkeys(terms))[:12]


def _embed_query(text: str) -> list[float]:
    """Embed a query using OpenAI text-embedding-3-small."""
    from openai import OpenAI
    settings = get_settings()
    client = OpenAI(api_key=settings.openai_api_key)
    response = client.embeddings.create(
        model="text-embedding-3-small",
        input=[text],
    )
    return response.data[0].embedding


def _keyword_retrieve(query: str, top_k: int = 5) -> list[dict]:
    """Hybrid retrieval: semantic search + direct article lookup."""
    try:
        import chromadb
        settings = get_settings()
        client = chromadb.PersistentClient(path=str(settings.chroma_path))
        collection = client.get_collection(settings.chroma_collection)

        results_map: dict[str, dict] = {}

        # 1) Direct lookup by article number (highest priority)
        article_numbers = _extract_article_numbers(query)
        for art_num in article_numbers:
            try:
                results = collection.get(
                    where={"article_number": art_num},
                    include=["documents", "metadatas"],
                )
                for i, doc_id in enumerate(results["ids"]):
                    meta = results["metadatas"][i] if results["metadatas"] else {}
                    doc = results["documents"][i] if results["documents"] else ""
                    full = " ".join(doc.split())
                    results_map[doc_id] = {
                        "article_number": meta.get("article_number"),
                        "article_title": meta.get("article_title"),
                        "snippet": full[:300],
                        "full_text": full,
                        "score": 100,
                    }
            except Exception:
                continue

        # 2) Semantic search via OpenAI embeddings
        try:
            query_embedding = _embed_query(query)
            sem_results = collection.query(
                query_embeddings=[query_embedding],
                n_results=top_k,
                include=["documents", "metadatas", "distances"],
            )
            ids = sem_results.get("ids", [[]])[0]
            docs = sem_results.get("documents", [[]])[0]
            metas = sem_results.get("metadatas", [[]])[0]
            distances = sem_results.get("distances", [[]])[0]

            for i, doc_id in enumerate(ids):
                if doc_id in results_map:
                    continue
                meta = metas[i] if metas else {}
                doc = docs[i] if docs else ""
                dist = distances[i] if distances else 1.0
                full = " ".join(doc.split())
                results_map[doc_id] = {
                    "article_number": meta.get("article_number"),
                    "article_title": meta.get("article_title"),
                    "snippet": full[:300],
                    "full_text": full,
                    "score": max(0, 10 - dist * 5),
                }
        except Exception:
            pass

        # 3) Second semantic pass with expanded formal terms
        expanded_terms = _expand_query_terms(query)
        if expanded_terms:
            expanded_query = " ".join(expanded_terms)
            try:
                expanded_embedding = _embed_query(expanded_query)
                exp_results = collection.query(
                    query_embeddings=[expanded_embedding],
                    n_results=top_k,
                    include=["documents", "metadatas", "distances"],
                )
                exp_ids = exp_results.get("ids", [[]])[0]
                exp_docs = exp_results.get("documents", [[]])[0]
                exp_metas = exp_results.get("metadatas", [[]])[0]
                exp_distances = exp_results.get("distances", [[]])[0]

                for i, doc_id in enumerate(exp_ids):
                    if doc_id in results_map:
                        continue
                    meta = exp_metas[i] if exp_metas else {}
                    doc = exp_docs[i] if exp_docs else ""
                    dist = exp_distances[i] if exp_distances else 1.0
                    full = " ".join(doc.split())
                    results_map[doc_id] = {
                        "article_number": meta.get("article_number"),
                        "article_title": meta.get("article_title"),
                        "snippet": full[:300],
                        "full_text": full,
                        "score": max(0, 10 - dist * 5) * 0.9,  # slightly lower weight
                    }
            except Exception:
                pass

        ranked = sorted(results_map.values(), key=lambda x: x["score"], reverse=True)
        # Filter out low-relevance results (direct lookups score=100, keep those always)
        ranked = [r for r in ranked if r["score"] >= 2.0]
        return ranked[:top_k]
    except Exception:
        return []

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
    action_plan: list[str] = Field(default_factory=list)
    obligations: list = Field(default_factory=list)
    clarifying_questions: list[str] = Field(default_factory=list)
    citations: list = Field(default_factory=list)
    confidence: float | None = None
    disclaimer: str | None = None


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
        kbk: str | None = None
        knp: str | None = None

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

    def _build_message(m: dict) -> dict:
        import json as _json
        msg = {
            "id": m["id"],
            "role": m["role"],
            "content": m["content"],
            "created_at": m["created_at"],
        }
        advice_raw = m.get("advice_json")
        if advice_raw and m["role"] == "assistant":
            advice = advice_raw if isinstance(advice_raw, dict) else {}
            if isinstance(advice_raw, str):
                try:
                    advice = _json.loads(advice_raw)
                except Exception:
                    advice = {}
            msg["action_plan"] = advice.get("action_plan", [])
            msg["obligations"] = advice.get("obligations", [])
            msg["clarifying_questions"] = advice.get("clarifying_questions", [])
            msg["citations"] = advice.get("citations", [])
            msg["disclaimer"] = advice.get("disclaimer")
        msg["confidence"] = m.get("confidence")
        return msg

    return {
        "id": session["id"],
        "user_id": session["user_id"],
        "title": session.get("title"),
        "status": session["status"],
        "knowledge_version": settings.knowledge_version,
        "created_at": session.get("created_at"),
        "messages": [_build_message(m) for m in messages],
    }


@router.delete(
    "/sessions/{sessionId}",
    responses={
        403: {"description": "Session belongs to another user"},
        404: {"description": "Session not found"},
    },
)
def delete_chat_session(sessionId: UUID, current_user: dict = Depends(get_current_user)):
    get_session = _require_db_func("get_session")
    delete_session = _require_db_func("delete_session")

    session_id_str = str(sessionId)
    session = get_session(session_id_str)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")

    _assert_session_owner(session, current_user["id"])
    delete_session(session_id_str)
    return {"ok": True}


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

        all_messages = [
            {"role": m["role"], "content": m["content"]}
            for m in get_messages(session_id_str)
            if m.get("role") in {"user", "assistant", "system"}
        ]
        history = all_messages[-15:]

        rag_articles = _keyword_retrieve(query=body.text, top_k=10)
        rag_articles = _rerank(query=body.text, articles=rag_articles, top_n=5)

        # Load user profile for personalization
        profile = {}
        get_profile_fn = getattr(db_module, "get_or_create_profile_by_user", None)
        if callable(get_profile_fn):
            try:
                profile = get_profile_fn(current_user["id"]) or {}
            except Exception:
                pass

        profile["name"] = current_user.get("name", "")
        profile["email"] = current_user.get("email", "")

        rules_result = {"obligations": [], "profile": profile}

        # Inject tax optimization if profile has enough data
        if profile.get("annual_income_kzt") and profile.get("tax_regime"):
            try:
                from src.optimizer.engine import optimize as run_optimize
                rules_result["optimization"] = run_optimize(profile, year=2026)
            except Exception:
                pass

        llm_output = generate_answer(history=history, rag_articles=rag_articles, rules_result=rules_result)

        assistant_msg_id = str(uuid.uuid4())
        answer_text = llm_output["answer_text"]
        assistant_now = datetime.now(timezone.utc).isoformat()
        advice_data = {
            "action_plan": llm_output["action_plan"],
            "obligations": llm_output["obligations"],
            "clarifying_questions": llm_output["clarifying_questions"],
            "citations": llm_output["citations"],
            "disclaimer": llm_output["disclaimer"],
        }
        insert_message(
            assistant_msg_id, session_id_str, "assistant", answer_text, assistant_now,
            advice_json=advice_data,
            confidence=llm_output["confidence"],
        )

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


@router.post("/sessions/{sessionId}/messages/stream")
def send_message_stream(
    sessionId: UUID,
    body: SendMessageRequest,
    background_tasks: BackgroundTasks,
    current_user: dict = Depends(get_current_user),
):
    """SSE streaming endpoint: streams answer text, then sends structured JSON."""
    get_session = _require_db_func("get_session")
    get_messages = _require_db_func("get_messages")
    insert_message = _require_db_func("insert_message")

    session_id_str = str(sessionId)
    session = get_session(session_id_str)
    if not session:
        raise HTTPException(status_code=404, detail="Session not found")
    _assert_session_owner(session, current_user["id"])

    now = datetime.now(timezone.utc).isoformat()
    existing_messages = get_messages(session_id_str)
    user_message_count = sum(1 for m in existing_messages if m.get("role") == "user")

    user_msg_id = str(uuid.uuid4())
    insert_message(user_msg_id, session_id_str, "user", body.text, now)

    all_messages = [
        {"role": m["role"], "content": m["content"]}
        for m in get_messages(session_id_str)
        if m.get("role") in {"user", "assistant", "system"}
    ]
    history = all_messages[-15:]

    rag_articles = _keyword_retrieve(query=body.text, top_k=10)
    rag_articles = _rerank(query=body.text, articles=rag_articles, top_n=5)

    profile = {}
    get_profile_fn = getattr(db_module, "get_or_create_profile_by_user", None)
    if callable(get_profile_fn):
        try:
            profile = get_profile_fn(current_user["id"]) or {}
        except Exception:
            pass
    profile["name"] = current_user.get("name", "")
    profile["email"] = current_user.get("email", "")
    rules_result = {"obligations": [], "profile": profile}

    # Inject tax optimization if profile has enough data
    if profile.get("annual_income_kzt") and profile.get("tax_regime"):
        try:
            from src.optimizer.engine import optimize as run_optimize
            rules_result["optimization"] = run_optimize(profile, year=2026)
        except Exception:
            pass

    if user_message_count == 0:
        background_tasks.add_task(_set_title_async, session_id_str, body.text)

    def event_generator():
        assistant_msg_id = str(uuid.uuid4())
        parsed_output = None

        for chunk in generate_answer_stream(
            history=history, rag_articles=rag_articles, rules_result=rules_result
        ):
            if chunk.startswith("\x00"):
                # Final structured data
                parsed_output = json.loads(chunk[1:])
                break
            # Stream text token
            yield f"data: {json.dumps({'type': 'token', 'content': chunk}, ensure_ascii=False)}\n\n"

        if not parsed_output:
            from src.llm.client import _fallback_answer
            parsed_output = _fallback_answer()

        # Save assistant message to DB
        assistant_now = datetime.now(timezone.utc).isoformat()
        advice_data = {
            "action_plan": parsed_output["action_plan"],
            "obligations": parsed_output["obligations"],
            "clarifying_questions": parsed_output["clarifying_questions"],
            "citations": parsed_output["citations"],
            "disclaimer": parsed_output["disclaimer"],
        }
        insert_message(
            assistant_msg_id, session_id_str, "assistant",
            parsed_output["answer_text"], assistant_now,
            advice_json=advice_data,
            confidence=parsed_output["confidence"],
        )

        # Send final structured event
        final_payload = {
            "type": "done",
            "message_id": assistant_msg_id,
            "answer_text": parsed_output["answer_text"],
            "action_plan": parsed_output["action_plan"],
            "obligations": parsed_output["obligations"],
            "clarifying_questions": parsed_output["clarifying_questions"],
            "citations": parsed_output["citations"],
            "confidence": parsed_output["confidence"],
            "disclaimer": parsed_output["disclaimer"],
        }
        yield f"data: {json.dumps(final_payload, ensure_ascii=False)}\n\n"

    return StreamingResponse(
        event_generator(),
        media_type="text/event-stream",
        headers={"Cache-Control": "no-cache", "X-Accel-Buffering": "no"},
    )
