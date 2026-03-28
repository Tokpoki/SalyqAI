# Agent Brief — Димаш (Frontend)

Работай только в `frontend/`.

## Твоя ответственность
- UI: чат, профиль, обязательства, цитаты
- Подключение к реальному backend API
- Красивый, современный, адаптивный интерфейс

## Нельзя
- Трогать `backend/` или `migrations/`
- Менять `docs/api.yaml` без обсуждения
- Создавать свои API эндпоинты

## Текущее состояние
- React 18 + Vite, работает на localhost:3000
- 3 мок-сценария (ИП, аренда, программист)
- Inline стили, нет TypeScript

## Целевой стек
TypeScript + Tailwind CSS + shadcn/ui + TanStack Query

## Backend API (уже работает на localhost:8000)
- `POST /api/v1/chat/sessions` — создать сессию
- `POST /api/v1/chat/sessions/{id}/messages` — отправить сообщение
- `GET /api/v1/chat/sessions/{id}` — получить историю

Формат ответов: `docs/api.yaml`

Подробные задачи: `docs/todo-dimash.md`
Туториал: `frontend/tutorial-dimash.md`
