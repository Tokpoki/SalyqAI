# TODO — Даурен (API Orchestrator)

Твоя зона: `backend/api_orchestrator/`

---

## Фаза 1 — Починить текущий код под контракт api.yaml

Сейчас ответы API не совпадают с `docs/api.yaml`. Конкретно:

- [ ] `POST /sessions` — добавить поле `knowledge_version` в ответ (сейчас отсутствует, api.yaml требует)
- [ ] `GET /sessions/{id}` — добавить поле `profile: null` в ответ (api.yaml требует в SessionDetail)
- [ ] `GET /sessions/{id}` — добавить `knowledge_version` в ответ
- [ ] `POST /messages` — ответ сейчас возвращает dict напрямую, нужна Pydantic-модель `ChatMessageResponse` чтобы контракт был строгим
- [ ] Загрузка конфига из `.env` (скопируй `.env.example` → `.env`, заполни). Добавить `python-dotenv` в requirements.txt
- [ ] Прочитать `GEMINI_API_KEY`, `DB_PATH`, `CHROMA_PATH` из env вместо хардкода

## Фаза 2 — LLM: Gemini system prompt + вызов

Ты отвечаешь за то, КАК бот думает и отвечает.

- [ ] Добавить `google-generativeai` в `requirements.txt`
- [ ] Создать `src/llm/prompt.py` — system prompt:
  ```
  Ты — Salyq AI, налоговый консультант по НК РК.
  Отвечай ТОЛЬКО на основе приложенных статей.
  Ссылайся на номер статьи (например: "согласно ст. 686 НК РК").
  Если не уверен — скажи "рекомендую уточнить у специалиста".
  ```
- [ ] Создать `src/llm/client.py` — функция `generate_answer(history, rag_articles, rules_result) → dict`:
  - Собрать prompt: system prompt + RAG-контекст (статьи) + Rules-результат (обязательства) + история чата
  - Вызвать Gemini API
  - **Парсинг ответа** — Gemini вернёт текст, но API ожидает структуру: `{answer_text, citations[], obligations[], confidence, disclaimer}`. Варианты:
    - Использовать Gemini JSON mode / structured output
    - Или парсить ответ regex/промптом "верни JSON"
  - Это ключевая сложность — протестировать и подобрать промпт который стабильно возвращает нужную структуру
- [ ] Собрать историю чата в формат для Gemini (достать из БД → [{role, content}])

## Фаза 3 — Оркестрация (полный pipeline)

Когда Магжан сделает `retrieve()` и `evaluate()`:

- [ ] В `send_message()` заменить заглушку на pipeline:
  1. Достать историю сообщений из БД
  2. Вызвать `retrieve(user_text)` → статьи
  3. Вызвать `evaluate(profile)` → обязательства
  4. Вызвать `generate_answer(history, articles, obligations)` → ответ
  5. Сохранить assistant message в БД
  6. Вернуть структурированный ответ
- [ ] Обработка ошибок: если Gemini API недоступен → вернуть fallback-ответ с `confidence: 0`

## Фаза 4 — Остальные эндпоинты из api.yaml

- [ ] `PATCH /api/v1/chat/sessions/{id}/profile` — обновление профиля. Нужна таблица `taxpayer_profiles` от Магжана. Если нет — вернуть 501
- [ ] `POST /api/v1/feedback` — сохранить лайк/дизлайк. Нужна таблица `feedback` от Магжана
- [ ] `GET /api/v1/knowledge/versions` — вернуть `["tax_code_2026_v1"]` (хардкод пока)
- [ ] RAG/Rules routes: Магжан пишет функции, ТЫ регистрируешь routes в api_orchestrator (потому что routes живут у тебя). Создать `src/routes/internal.py` с `/api/v1/rag/retrieve` и `/api/v1/rules/evaluate` которые вызывают функции Магжана

## Фаза 5 — Продакшн

- [ ] Rate limiting
- [ ] Логирование
- [ ] Тесты (pytest + httpx)
