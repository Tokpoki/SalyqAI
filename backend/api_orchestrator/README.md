# API Orchestrator (Даурен)

FastAPI-сервер, публичное API для фронтенда.

## Запуск

```bash
cd backend/api_orchestrator
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

## Эндпоинты

| Метод | Путь | Описание |
|-------|------|----------|
| GET | `/api/v1/health` | Проверка здоровья |
| POST | `/api/v1/chat/sessions` | Создать сессию |
| GET | `/api/v1/chat/sessions/{id}` | Сессия + история |
| POST | `/api/v1/chat/sessions/{id}/messages` | Отправить сообщение |

## Swagger UI

http://localhost:8000/docs — тестирование API в браузере.

## Контракт

Источник правды: `docs/api.yaml`
