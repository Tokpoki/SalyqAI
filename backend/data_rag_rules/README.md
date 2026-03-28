# Data / RAG / Rules (Магжан)

База данных, поиск по статьям НК РК, движок налоговых правил.

## Уже готово

В корне проекта лежат результаты предварительной работы:
- `chroma/` — Chroma vector DB, 844 статьи НК РК, embedding модель `intfloat/multilingual-e5-large`
- Коллекция: `rk_tax_code_2026_articles_e5_large`
- `rk_tax_code_2026_articles.json` — полный JSON со всеми статьями
- `parse_tax_code_to_chroma.py` — скрипт парсинга PDF (уже отработал)

## Структура

```
src/
├── db/
│   └── database.py   ← SQLite: таблицы, CRUD-операции (работает)
├── rag/               ← TODO: retriever.py — обёртка для поиска по Chroma
└── rules/             ← TODO: engine.py — детерминированные правила
```

## Целевая схема БД

`docs/db-schema.sql` — 6 таблиц (PostgreSQL). Сейчас реализованы 2.
