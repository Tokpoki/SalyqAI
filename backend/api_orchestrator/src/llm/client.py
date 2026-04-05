"""LLM client and response parsing for chat answers."""

from __future__ import annotations

import json
import re
from typing import Any, Generator

# import google.generativeai as genai  # Gemini — temporarily disabled
from openai import OpenAI

from src.config import get_settings
from src.llm.prompt import get_system_prompt, build_user_prompt


def _fallback_answer() -> dict[str, Any]:
    return {
        "answer_text": "Сервис генерации ответа временно недоступен. Рекомендую повторить запрос позже.",
        "action_plan": [],
        "obligations": [],
        "clarifying_questions": [],
        "citations": [],
        "confidence": 0.0,
        "disclaimer": "LLM fallback response",
    }


def _extract_json_object(text: str) -> dict[str, Any]:
    text = text.strip()
    if not text:
        raise ValueError("Empty model response")

    try:
        data = json.loads(text)
        if isinstance(data, dict):
            return data
    except json.JSONDecodeError:
        pass

    fence_match = re.search(r"```json\s*(\{.*?\})\s*```", text, flags=re.DOTALL)
    if fence_match:
        data = json.loads(fence_match.group(1))
        if isinstance(data, dict):
            return data

    first_brace = text.find("{")
    last_brace = text.rfind("}")
    if first_brace != -1 and last_brace != -1 and last_brace > first_brace:
        data = json.loads(text[first_brace : last_brace + 1])
        if isinstance(data, dict):
            return data

    raise ValueError("Could not parse JSON object from model response")


def _normalize_output(raw: dict[str, Any]) -> dict[str, Any]:
    answer_text = raw.get("answer_text")
    if not isinstance(answer_text, str) or not answer_text.strip():
        answer_text = "Не удалось сформировать корректный ответ. Рекомендую уточнить вопрос."

    action_plan = raw.get("action_plan")
    if not isinstance(action_plan, list):
        action_plan = []

    obligations = raw.get("obligations")
    if not isinstance(obligations, list):
        obligations = []

    clarifying_questions = raw.get("clarifying_questions")
    if not isinstance(clarifying_questions, list):
        clarifying_questions = []

    citations = raw.get("citations")
    if not isinstance(citations, list):
        citations = []

    confidence = raw.get("confidence")
    if not isinstance(confidence, (int, float)):
        confidence = 0.0
    confidence = max(0.0, min(1.0, float(confidence)))

    disclaimer = raw.get("disclaimer")
    if not isinstance(disclaimer, str) or not disclaimer.strip():
        disclaimer = "Ответ носит информационный характер и не заменяет консультацию специалиста."

    return {
        "answer_text": answer_text,
        "action_plan": [str(x) for x in action_plan],
        "obligations": obligations,
        "clarifying_questions": [str(x) for x in clarifying_questions],
        "citations": citations,
        "confidence": confidence,
        "disclaimer": disclaimer,
    }


# ── Gemini implementation (commented out) ──────────────────────────────────
# def _generate_gemini(history, rag_articles, rules_result):
#     settings = get_settings()
#     api_key = settings.gemini_api_key
#     if not api_key:
#         return _fallback_answer()
#     model_name = settings.gemini_model
#     prompt = build_user_prompt(history=history, rag_articles=rag_articles, rules_result=rules_result)
#     genai.configure(api_key=api_key)
#     model = genai.GenerativeModel(model_name)
#     response = model.generate_content(
#         [SYSTEM_PROMPT, prompt],
#         generation_config={"response_mime_type": "application/json"},
#     )
#     raw_text = getattr(response, "text", "") or ""
#     raw_data = _extract_json_object(raw_text)
#     return _normalize_output(raw_data)


# ── OpenAI implementation ──────────────────────────────────────────────────
def _generate_openai(history, rag_articles, rules_result):
    settings = get_settings()
    api_key = settings.openai_api_key
    if not api_key:
        return _fallback_answer()

    model_name = settings.openai_model
    language = rules_result.get("profile", {}).get("language", "ru") or "ru"
    prompt = build_user_prompt(history=history, rag_articles=rag_articles, rules_result=rules_result)

    client = OpenAI(api_key=api_key)
    response = client.chat.completions.create(
        model=model_name,
        messages=[
            {"role": "system", "content": get_system_prompt(language)},
            {"role": "user", "content": prompt},
        ],
        response_format={"type": "json_object"},
    )
    raw_text = response.choices[0].message.content or ""
    raw_data = _extract_json_object(raw_text)
    return _normalize_output(raw_data)


def generate_answer(
    history: list[dict],
    rag_articles: list[dict],
    rules_result: dict,
) -> dict[str, Any]:
    try:
        return _generate_openai(history, rag_articles, rules_result)
    except Exception as exc:
        import traceback
        traceback.print_exc()
        return _fallback_answer()


def generate_answer_stream(
    history: list[dict],
    rag_articles: list[dict],
    rules_result: dict,
) -> Generator[str, None, None]:
    """Collect full LLM JSON response, then stream answer_text chunk by chunk.

    Yields text chunks from answer_text. The final yield is the complete parsed
    JSON (prefixed with \\x00 sentinel) so the caller can send structured data.
    """
    settings = get_settings()
    api_key = settings.openai_api_key
    if not api_key:
        fallback = _fallback_answer()
        yield "\x00" + json.dumps(fallback, ensure_ascii=False)
        return

    language = rules_result.get("profile", {}).get("language", "ru") or "ru"
    prompt = build_user_prompt(history=history, rag_articles=rag_articles, rules_result=rules_result)

    client = OpenAI(api_key=api_key)
    try:
        # Collect full JSON response first (streamed from OpenAI for speed)
        stream = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": get_system_prompt(language)},
                {"role": "user", "content": prompt},
            ],
            response_format={"type": "json_object"},
            stream=True,
        )
        full_text = ""
        for chunk in stream:
            delta = chunk.choices[0].delta if chunk.choices else None
            if delta and delta.content:
                full_text += delta.content

        raw_data = _extract_json_object(full_text)
        parsed = _normalize_output(raw_data)

        # Stream answer_text in small chunks for typing effect
        answer = parsed["answer_text"]
        chunk_size = 12
        for i in range(0, len(answer), chunk_size):
            yield answer[i:i + chunk_size]

        # Send complete structured data as final event
        yield "\x00" + json.dumps(parsed, ensure_ascii=False)
    except Exception:
        import traceback
        traceback.print_exc()
        fallback = _fallback_answer()
        yield "\x00" + json.dumps(fallback, ensure_ascii=False)


def _generate_title_openai(first_user_message: str) -> str:
    settings = get_settings()
    if not settings.openai_api_key:
        return "Новый чат"

    client = OpenAI(api_key=settings.openai_api_key)
    response = client.chat.completions.create(
        model=settings.openai_model,
        messages=[
            {
                "role": "user",
                "content": f"Дай название 3-5 слов на русском для чата, начавшегося с: '{first_user_message}'. Верни только название.",
            },
        ],
    )
    title = (response.choices[0].message.content or "").strip().strip("\"'")
    return title[:120] if title else "Новый чат"


def generate_chat_title(first_user_message: str) -> str:
    try:
        return _generate_title_openai(first_user_message)
    except Exception:
        return "Новый чат"
