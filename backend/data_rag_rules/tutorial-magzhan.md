# Туториал для Магжана — Data / RAG / Rules

## Что ты делаешь

1. **База данных** — таблицы, миграции, CRUD-функции
2. **RAG** — поиск статей НК РК по вопросу (Chroma уже готова)
3. **Rules** — детерминированные правила ("ИП упрощёнка → форма 910")

## Что уже готово (не трогай!)

- `chroma/` — 844 статьи НК РК с embeddings
- Коллекция: `rk_tax_code_2026_articles_e5_large`
- `rk_tax_code_2026_articles.json` — все статьи в JSON

## Твоя папка

```
backend/data_rag_rules/
├── src/
│   ├── db/
│   │   └── database.py     ← таблицы + CRUD
│   ├── rag/
│   │   └── retriever.py    ← поиск по Chroma
│   └── rules/
│       └── engine.py       ← if/else правила
├── requirements.txt
└── tests/

migrations/                  ← SQL-файлы миграций
```

## Phase 2 — Таблица `users`

В Phase 2 появляется авторизация. Тебе нужно создать таблицу `users` и обновить существующие.

### Что создать

```sql
-- migrations/0003_add_users.sql
CREATE TABLE IF NOT EXISTS users (
  id TEXT PRIMARY KEY,
  email TEXT NOT NULL UNIQUE,
  password_hash TEXT NOT NULL,
  name TEXT NOT NULL,
  created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
```

### Что обновить

`chat_sessions` получает два новых поля:
- `user_id` — чей это чат
- `title` — название чата (Gemini сгенерирует)

`taxpayer_profiles` получает:
- `user_id` — привязка к юзеру вместо сессии

### CRUD функции

Даурен будет вызывать из своего кода:
```python
from db.database import create_user, get_user_by_email, ...
```

Тебе нужно написать:
- `create_user(user_id, email, password_hash, name)`
- `get_user_by_email(email)` — для проверки при логине
- `get_user_by_id(user_id)` — для `/auth/me`
- `get_sessions_by_user(user_id)` — для sidebar со списком чатов
- `update_session_title(session_id, title)` — для автоназвания
- `get_or_create_profile_by_user(user_id)` — профиль юзера
- `update_profile_by_user(user_id, fields)` — обновление профиля

### Seed тестового юзера

```python
import bcrypt
password_hash = bcrypt.hashpw(b"123", bcrypt.gensalt()).decode()
# Сохранить: email="test@mail.com", name="Test User"
```

## RAG — поиск по Chroma

```python
import chromadb

CHROMA_PATH = "../../chroma"
COLLECTION = "rk_tax_code_2026_articles_e5_large"

def retrieve(query: str, top_k: int = 5) -> list[dict]:
    client = chromadb.PersistentClient(path=CHROMA_PATH)
    col = client.get_collection(COLLECTION)
    results = col.query(query_texts=[f"query: {query}"], n_results=top_k)
    # ... вернуть [{article_number, article_title, snippet, score}]
```

**Важно:** e5 модель требует префикс `"query: "` для запросов.

## Git

```bash
git checkout main && git pull
git checkout -b magzhan/task-name
git add backend/data_rag_rules/ migrations/
git commit -m "feat: add users table"
git push -u origin magzhan/task-name
```

## Чего НЕ делать

- Не трогай `backend/api_orchestrator/` — Даурен
- Не трогай `frontend/` — Димаш
- Не удаляй `chroma/`
