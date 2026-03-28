# Agent Brief — Магжан (Data / RAG / Rules)

Работай только в `backend/data_rag_rules/` и `migrations/`.

## Твоя ответственность
- RAG: обёртка для поиска по уже готовой Chroma vector DB
- Rules: детерминированный движок налоговых правил
- БД: расширение таблиц, миграции, CRUD-операции

## Уже готово (не пересоздавать!)
- `chroma/` — Chroma vector DB с 844 статьями НК РК (embeddings: `intfloat/multilingual-e5-large`)
- Коллекция: `rk_tax_code_2026_articles_e5_large`
- `rk_tax_code_2026_articles.json` — все статьи в JSON
- `parse_tax_code_to_chroma.py` — скрипт парсинга (уже отработал)

## Нельзя
- Трогать `backend/api_orchestrator/` или `frontend/`
- Удалять или пересоздавать `chroma/`
- Менять контракт API без обсуждения
- Переписывать старые миграции

## Первоочередные задачи
1. `src/rag/retriever.py` — функция `retrieve(query, top_k)` поверх существующей Chroma
2. `src/rules/engine.py` — функция `evaluate(profile)` → обязательства
3. Экспортировать обе функции для оркестратора Даурена

## Внутренние эндпоинты (нужно реализовать)
- `POST /api/v1/rag/retrieve`
- `POST /api/v1/rules/evaluate`

Подробные задачи: `docs/todo-magzhan.md`
Туториал: `backend/data_rag_rules/tutorial-magzhan.md`
