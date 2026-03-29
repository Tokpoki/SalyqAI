"""OKED checker — determines user's OKED from activity description and checks ban status."""

import json
import logging
from pathlib import Path

from openai import OpenAI
from src.config import get_settings

logger = logging.getLogger(__name__)

_BANNED_PATH = Path(__file__).parent / "banned_oked.json"
_banned_list: list[dict] | None = None


def _load_banned() -> list[dict]:
    global _banned_list
    if _banned_list is None:
        with open(_BANNED_PATH, encoding="utf-8") as f:
            _banned_list = json.load(f)
    return _banned_list


def _banned_codes_set() -> set[str]:
    return {item["code"] for item in _load_banned()}


def _banned_summary() -> str:
    """Compact list for the GPT prompt: code — name."""
    lines = [f'{item["code"]} — {item["name"]}' for item in _load_banned()]
    return "\n".join(lines)


_DETECT_PROMPT = """Ты — эксперт по классификации ОКЭД Республики Казахстан.

Пользователь описал свою деятельность. Определи наиболее подходящий код ОКЭД.

Вот список ЗАПРЕЩЁННЫХ для упрощёнки кодов ОКЭД (Постановление Правительства РК № 970):
{banned_list}

Правила:
1. Определи один наиболее подходящий код ОКЭД для описанной деятельности.
2. Код ДОЛЖЕН быть реальным кодом ОКЭД РК — не придумывай несуществующие коды.
3. Проверь, есть ли этот код в списке запрещённых выше.
4. Если деятельность слишком расплывчата и ты не уверен — верни oked: null.

Верни ТОЛЬКО JSON:
{{"oked": "XXXXX", "oked_name": "Название вида деятельности", "banned": true/false, "reason": "Краткое пояснение"}}

Если не удалось определить:
{{"oked": null, "oked_name": null, "banned": false, "reason": "Не удалось определить ОКЭД"}}"""


def detect_oked(activity_description: str) -> dict:
    """Call GPT to detect OKED from free-text activity description.

    Returns dict with keys: oked, oked_name, banned, reason.
    """
    if not activity_description or not activity_description.strip():
        return {"oked": None, "oked_name": None, "banned": False, "reason": "Описание деятельности не указано"}

    settings = get_settings()
    api_key = settings.openai_api_key
    if not api_key:
        logger.warning("No OpenAI API key — skipping OKED detection")
        return {"oked": None, "oked_name": None, "banned": False, "reason": "API недоступен"}

    prompt = _DETECT_PROMPT.format(banned_list=_banned_summary())

    try:
        client = OpenAI(api_key=api_key)
        response = client.chat.completions.create(
            model=settings.openai_model,
            messages=[
                {"role": "system", "content": prompt},
                {"role": "user", "content": activity_description},
            ],
            response_format={"type": "json_object"},
        )
        raw = response.choices[0].message.content or "{}"
        result = json.loads(raw)
    except Exception:
        logger.exception("OKED detection failed")
        return {"oked": None, "oked_name": None, "banned": False, "reason": "Ошибка определения ОКЭД"}

    oked = result.get("oked")
    # Validate: if GPT returned a code, verify ban status against our list
    if oked:
        actually_banned = oked in _banned_codes_set()
        result["banned"] = actually_banned

    return {
        "oked": result.get("oked"),
        "oked_name": result.get("oked_name"),
        "banned": result.get("banned", False),
        "reason": result.get("reason", ""),
    }
