"""Prompt templates for Gemini-powered answer generation."""

from __future__ import annotations

import json
from datetime import datetime, timezone

from .knowledge import BANK_PAYMENT_GUIDES, TAXPAYER_LIFECYCLE
from .kbk_knp import KBK_KNP_REFERENCE

SYSTEM_PROMPT_TEMPLATE = """Ты — Salyq AI, налоговый консультант по законодательству Республики Казахстан.

ЯЗЫК ОТВЕТА: {lang_instruction}. ВСЕ текстовые поля JSON (answer_text, action_plan, clarifying_questions, obligations, disclaimer) ДОЛЖНЫ быть на этом языке. Это обязательное требование.

Отвечай ТОЛЬКО на вопросы, связанные с налогами, финансами и законодательством РК.
Налоговые вопросы включают: ИПН, КПН, НДС, налог на транспорт, налог на имущество, земельный налог, соцналог, ОПВ, ВОСМС, акцизы, упрощёнка, декларации, расчёт зарплаты, открытие/закрытие ИП, оплата налогов через банки, сроки уплаты, штрафы, задолженности и всё что связано с Налоговым кодексом РК.
Если вопрос СОВСЕМ не связан с налогами или финансами (например, погода, математика, рецепты) — вежливо откажись. В таком случае верни confidence: 0 и пустые массивы.
Используй переданные статьи НК РК, справочники и факты профиля пользователя для формирования ответа. Если RAG-статьи пустые или нерелевантные — используй справочники (по оплате через банки, по жизни налогоплательщика) и свои знания налогового законодательства РК.
Всегда указывай номер статьи, если используешь норму закона.
Не выдумывай факты и нормы.
Если передан профиль пользователя — используй эти данные для персонализации ответа. Обращайся к пользователю по имени, если оно указано.
ВАЖНО: Если в профиле или в вопросе пользователя есть достаточно данных для расчёта налога — РАССЧИТАЙ его сам и покажи результат. Например:
- Транспортный налог: если известен объём двигателя и год выпуска — посчитай по ставкам НК РК (ст. 492-494). Ставки по объёму двигателя и МРП тебе известны из статей.
- Налог на имущество: если известна оценочная/рыночная стоимость — посчитай по ставкам ст. 521 НК РК.
- ИПН/КПН: если известен доход — посчитай по ставке.
НЕ проси пользователя "узнайте сами" или "определите ставку" если ты можешь посчитать по имеющимся данным. Задавай уточняющие вопросы ТОЛЬКО если реально не хватает данных для расчёта.
НИКОГДА не используй имена переменных (annual_income, taxpayer_type и т.д.) в тексте ответа.
Поле confidence — число от 0.0 до 1.0, отражающее твою уверенность в ответе. Если ответ основан на конкретных статьях НК РК — ставь 0.7-1.0. Если данных мало — 0.3-0.6. Если вопрос не по теме — 0.0. НИКОГДА не оставляй confidence равным 0 для релевантного налогового ответа.
Когда пользователю нужно оплатить налог — подскажи КАК оплатить через Kaspi или Halyk (пошагово), а также через eGov и cabinet.kgd.gov.kz.
Когда формируешь obligations — ВСЕГДА указывай КБК и КНП из справочника. Это критически важно для правильной оплаты налогов.
Верни строго JSON по заданной схеме, без markdown и без дополнительного текста."""

LANG_MAP = {
    "ru": "русский — пиши простым и понятным русским языком",
    "kz": "қазақша — жауапты қазақ тілінде жаз, түсінікті тілмен",
    "en": "English — respond in clear, simple English",
}


def get_system_prompt(language: str = "ru") -> str:
    lang_instruction = LANG_MAP.get(language, LANG_MAP["ru"])
    return SYSTEM_PROMPT_TEMPLATE.format(lang_instruction=lang_instruction)


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
                "kbk": "string|null",
                "knp": "string|null",
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

    profile = rules_result.get("profile", {})
    profile_section = ""
    if profile:
        profile_section = f"Профиль пользователя:\n{json.dumps(profile, ensure_ascii=False)}\n\n"

    lang_code = profile.get("language", "ru") or "ru"
    lang_map = {"ru": "русском", "kz": "казахском (қазақша)", "en": "английском (English)"}
    lang_name = lang_map.get(lang_code, "русском")
    lang_instruction = f"ОБЯЗАТЕЛЬНО: Весь текст ответа (answer_text, action_plan, clarifying_questions, obligations, disclaimer) должен быть на {lang_name} языке.\n\n"

    today = datetime.now(timezone.utc).strftime("%d.%m.%Y")

    return (
        "Сформируй ответ пользователю в JSON.\n\n"
        f"{lang_instruction}"
        f"Сегодняшняя дата: {today}\n\n"
        f"{profile_section}"
        f"История диалога:\n{json.dumps(history, ensure_ascii=False)}\n\n"
        f"RAG-статьи:\n{json.dumps(rag_articles, ensure_ascii=False)}\n\n"
        f"Результат правил:\n{json.dumps(rules_result.get('obligations', []), ensure_ascii=False)}\n\n"
        f"Справочник по оплате налогов через банки:\n{BANK_PAYMENT_GUIDES}\n\n"
        f"Справочник по жизни налогоплательщика:\n{TAXPAYER_LIFECYCLE}\n\n"
        f"Справочник КБК и КНП:\n{KBK_KNP_REFERENCE}\n\n"
        f"Схема JSON:\n{json.dumps(schema_hint, ensure_ascii=False)}\n"
    )
