# TODO — Магжан (Data / RAG / Rules)

Твоя зона: `backend/data_rag_rules/` и `migrations/`
Ты отвечаешь за базу данных, поиск по статьям НК РК, и движок налоговых правил.

---

## Что уже готово (не нужно переделывать!)

- Chroma vector DB с 844 статьями НК РК → `chroma/` (32 МБ)
- Embedding модель: `intfloat/multilingual-e5-large`
- Коллекция: `rk_tax_code_2026_articles_e5_large`
- JSON со всеми статьями → `rk_tax_code_2026_articles.json` (5 МБ)
- Скрипт парсинга PDF → `parse_tax_code_to_chroma.py`

## Фаза 1 — Обёртка для RAG (поиск по Chroma)

- [ ] Написать `src/rag/retriever.py` — функция `retrieve(query, top_k=5)` которая:
  1. Подключается к существующей Chroma в `chroma/`
  2. Ищет по коллекции `rk_tax_code_2026_articles_e5_large`
  3. Возвращает список `{ article_number, article_title, snippet, score }`
- [ ] Реализовать эндпоинт `POST /api/v1/rag/retrieve` (обёртка над `retrieve()`)
- [ ] Тесты: "ИП упрощёнка" → должны найтись статьи 683, 686, 687

## Фаза 2 — Rules Engine (детерминированные правила)

- [ ] Написать `src/rules/engine.py` — функция `evaluate(profile) → obligations[]`
- [ ] Правило: ИП упрощёнка → форма 910, ОПВ, СО с дедлайнами
- [ ] Правило: физлицо с арендой → форма 240.00, ИПН 10%
- [ ] Правило: доход из-за рубежа → форма 240.00, зачёт иностранного налога
- [ ] Реализовать эндпоинт `POST /api/v1/rules/evaluate`
- [ ] Тесты в `backend/data_rag_rules/tests/`

## Фаза 3 — Расширить базу данных

- [ ] Добавить таблицу `taxpayer_profiles` (профиль налогоплательщика)
- [ ] Добавить таблицу `extracted_facts` (факты из диалога)
- [ ] Добавить таблицу `answer_citations` (ссылки на статьи в ответах)
- [ ] Добавить таблицу `feedback` (обратная связь)
- [ ] Создать миграции в `migrations/` (формат: `0001_init.sql`, `0002_add_profiles.sql`)
- [ ] Позже: перейти с SQLite на PostgreSQL (схема в `docs/db-schema.sql`)

## Фаза 4 — Интеграция

- [ ] Экспортировать `retrieve()` и `evaluate()` чтобы Даурен мог вызывать из оркестратора
- [ ] Договориться с Дауреном о формате вызовов
