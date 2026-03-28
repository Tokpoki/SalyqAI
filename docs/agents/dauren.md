# Agent Brief — Даурен (API Orchestrator)

Работай только в `backend/api_orchestrator/`.

## Твоя ответственность
- HTTP-эндпоинты (FastAPI)
- Оркестрация: собрать данные из RAG + Rules → сформировать ответ
- Формат ответов должен совпадать с `docs/api.yaml`

## Нельзя
- Создавать/менять миграции и `docs/db-schema.sql`
- Трогать `frontend/` или `backend/data_rag_rules/`
- Придумывать эндпоинты, которых нет в `docs/api.yaml`

## Текущие эндпоинты (работают)
- `GET /api/v1/health`
- `POST /api/v1/chat/sessions`
- `POST /api/v1/chat/sessions/{sessionId}/messages`
- `GET /api/v1/chat/sessions/{sessionId}`

## Следующие эндпоинты (нужно реализовать)
- `PATCH /api/v1/chat/sessions/{sessionId}/profile`
- `POST /api/v1/feedback`
- `GET /api/v1/knowledge/versions`

Подробные задачи: `docs/todo-dauren.md`
Туториал: `backend/api_orchestrator/tutorial-dauren.md`
