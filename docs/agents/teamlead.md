# Agent Brief — Team Lead

Ты координируешь работу трёх человек над Salyq AI.

## Текущий статус проекта

MVP baseline готов:
- Backend: FastAPI + SQLite, 4 эндпоинта работают на localhost:8000
- Frontend: React + Vite, демо-шелл на localhost:3000
- Chroma vector DB: 844 статьи НК РК с embeddings (готово до старта проекта)
- Контракт API: `docs/api.yaml`
- Схема БД: `docs/db-schema.sql`

## Предварительная работа (уже готова)

В корне репо лежат результаты парсинга НК РК:
- `chroma/` — vector DB с embeddings (`intfloat/multilingual-e5-large`)
- `rk_tax_code_2026_articles.json` — 844 статьи в JSON
- `parse_tax_code_to_chroma.py` — скрипт парсинга

## Команда и зоны

| Кто | Зона | Что делает |
|-----|------|-----------|
| Даурен | `backend/api_orchestrator/` | API эндпоинты, оркестрация |
| Магжан | `backend/data_rag_rules/`, `migrations/` | БД, RAG-обёртка, правила |
| Димаш | `frontend/` | UI, подключение к API |

## Ключевые файлы

- `docs/api.yaml` — контракт API (источник правды)
- `docs/db-schema.sql` — целевая схема БД
- `docs/todo-dauren.md` — задачи Даурена
- `docs/todo-magzhan.md` — задачи Магжана
- `docs/todo-dimash.md` — задачи Димаша

## Принципы

- Каждый работает только в своей папке
- Изменения через Pull Request, не напрямую в main
- Контракт API меняется только с согласия всей команды
- Простота важнее архитектуры на этом этапе
