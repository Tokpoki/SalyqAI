# TODO — Магжан (Data / RAG / Rules)

Твоя зона: `backend/data_rag_rules/` и `migrations/`

---

## Что уже готово (не трогай!)

- `chroma/` — Chroma vector DB, 844 статьи, embedding `intfloat/multilingual-e5-large`
- `rk_tax_code_2026_articles.json` — все статьи в JSON
- `parse_tax_code_to_chroma.py` — скрипт парсинга (уже отработал)

## Фаза 1 — RAG retriever

- [ ] `pip install -r requirements.txt` (chromadb + sentence-transformers)
  **Внимание:** sentence-transformers скачает модель ~2.2 ГБ при первом запуске. Это нормально, нужен интернет.
- [ ] Создать `src/rag/__init__.py`
- [ ] Создать `src/rag/retriever.py` с функцией `retrieve(query: str, top_k: int = 5) -> list[dict]`
  - Подключиться к Chroma: `chromadb.PersistentClient(path=CHROMA_PATH)`
  - Получить коллекцию: `client.get_collection("rk_tax_code_2026_articles_e5_large")`
  - **Важный нюанс:** при создании Chroma использовался `SentenceTransformer("intfloat/multilingual-e5-large")` с префиксом `"query: "` для e5 моделей. При query тоже нужен этот префикс. Проверь как именно парсер загружал embeddings в `parse_tax_code_to_chroma.py`
  - Вернуть формат, совпадающий с `Citation` в api.yaml: `{article_number, article_title, snippet, score}`
- [ ] **Проверить руками** что поиск работает:
  ```python
  from src.rag.retriever import retrieve
  results = retrieve("какие налоги платит ИП на упрощёнке")
  # Должны быть статьи ~683, 686, 687
  ```
- [ ] Путь к Chroma читать из env `CHROMA_PATH` (default: `../../chroma`)

## Фаза 2 — Rules Engine

- [ ] Создать `src/rules/__init__.py`
- [ ] Создать `src/rules/engine.py` с функцией `evaluate(profile: dict) -> dict`
  - Вход: `profile` в формате `ProfilePatchRequest` из api.yaml (поля: `taxpayer_type`, `tax_regime`, `has_rental_income`, `has_foreign_income`, ...)
  - Выход: `{obligations: [...], warnings: [...]}` в формате `RulesEvaluateResponse` из api.yaml
  - Каждый obligation: `{code, title, due_date_rule, amount_kzt, basis}` — формат `Obligation` из api.yaml
- [ ] Реализовать правила:
  - ИП упрощёнка (`sole_proprietor` + `simplified`) → форма 910, ОПВ, СО
  - Физлицо с арендой (`individual` + `has_rental_income: true`) → форма 240.00, ИПН 10%
  - Иностранный доход (`has_foreign_income: true`) → форма 240.00, зачёт
- [ ] Тесты в `tests/test_rules.py`

## Фаза 3 — Расширить БД

Текущая БД (SQLite) имеет 2 таблицы. Целевая (`docs/db-schema.sql`) — 6 таблиц. Разница:

- [ ] Таблица `chat_sessions` — добавить поля `knowledge_version`, `updated_at` (сейчас отсутствуют)
- [ ] Таблица `chat_messages` — добавить поля `advice_json`, `confidence` (сейчас отсутствуют)
- [ ] Новая таблица `taxpayer_profiles` — профиль налогоплательщика в сессии
- [ ] Новая таблица `extracted_facts` — факты, извлечённые из диалога (fact_key/fact_value)
- [ ] Новая таблица `answer_citations` — ссылки на статьи в ответах
- [ ] Новая таблица `feedback` — лайк/дизлайк
- [ ] CRUD-функции для каждой новой таблицы в `src/db/database.py`
- [ ] Миграции в `migrations/`: `0001_init.sql`, `0002_add_profiles.sql`, ...

## Фаза 4 — Извлечение фактов из диалога

Кто-то должен парсить из текста пользователя: "Я ИП на упрощёнке, доход 12 млн" → `{taxpayer_type: "sole_proprietor", tax_regime: "simplified", annual_income_kzt: 12000000}`.

- [ ] Решить с тимлидом: это делает LLM (Даурен) или отдельная функция (ты)?
  - Вариант А: Gemini извлекает факты → Даурен вызывает `PATCH /profile`
  - Вариант Б: отдельная функция `extract_facts(text) -> dict` у тебя
- [ ] Реализовать выбранный вариант
- [ ] Сохранять факты в `extracted_facts`

## Фаза 5 — Интеграция

- [ ] Экспортировать `retrieve()` и `evaluate()` так, чтобы Даурен мог их импортировать
- [ ] Даурен зарегистрирует HTTP-routes для `/rag/retrieve` и `/rules/evaluate` (routes живут у него)
