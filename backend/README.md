# Backend

Два модуля, два владельца. Границы строгие — каждый работает только в своей папке.

| Модуль | Владелец | Что делает |
|--------|---------|-----------|
| `api_orchestrator/` | Даурен | HTTP API, оркестрация запросов |
| `data_rag_rules/` | Магжан | БД, RAG-поиск, движок правил |

## Быстрый старт

```bash
cd backend/api_orchestrator
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

## Архитектура (MVP)

```
Фронтенд (localhost:3000)
    ↓ HTTP
api_orchestrator (localhost:8000)
    ↓ import
data_rag_rules
    ↓
SQLite (salyq_dev.db)
```

Позже `data_rag_rules` добавит RAG (Chroma) и Rules Engine, а `api_orchestrator` будет их оркестрировать.
