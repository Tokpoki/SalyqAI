"""Prompt templates for Gemini-powered answer generation."""

from __future__ import annotations

import json

SYSTEM_PROMPT = """Ты — Salyq AI, налоговый консультант по законодательству Республики Казахстан.
Отвечай ТОЛЬКО на основе переданных статей НК РК и фактов профиля.
Всегда указывай номер статьи, если используешь норму закона.
Не выдумывай факты и нормы. Если данных недостаточно — задай уточняющие вопросы.
Язык ответа: русский, простой и понятный.
Верни строго JSON по заданной схеме, без markdown и без дополнительного текста."""


def build_user_prompt(
    history: list[dict],
    rag_articles: list[dict],
    rules_result: dict,
) -> str:
    schema_hint = {
        "answer_text": "string",
        "action_plan": ["string"],
        "obligations": [
            {
                "code": "string",
                "title": "string",
                "due_date_rule": "string",
                "amount_kzt": "number|null",
                "basis": "string",
            }
        ],
        "clarifying_questions": ["string"],
        "citations": [
            {
                "article_number": "string",
                "article_title": "string",
                "snippet": "string",
            }
        ],
        "confidence": 0.0,
        "disclaimer": "string",
    }

    return (
        "Сформируй ответ пользователю в JSON.\n\n"
        f"История диалога:\n{json.dumps(history, ensure_ascii=False)}\n\n"
        f"RAG-статьи:\n{json.dumps(rag_articles, ensure_ascii=False)}\n\n"
        f"Результат правил:\n{json.dumps(rules_result, ensure_ascii=False)}\n\n"
        f"Схема JSON:\n{json.dumps(schema_hint, ensure_ascii=False)}\n"
    )
