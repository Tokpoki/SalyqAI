# TODO — Магжан (Data / RAG / Rules)

Твоя зона: `backend/data_rag_rules/` и `migrations/`

---

## Что изменилось в db-schema.sql

Тимлид обновил `docs/db-schema.sql`. Вот что добавлено — чтобы ты знал что реализовывать:

**Новая таблица:** `users(id, email UNIQUE, password_hash, name, created_at)`
**Изменения:** `chat_sessions` → добавлены `user_id`, `title`
**Изменения:** `taxpayer_profiles` → `user_id` вместо `session_id` (unique per user)
**Новая таблица:** `error_logs(id, user_id, session_id, error_type, error_message, stack_trace, created_at)`
**Типы:** всё TEXT/REAL/INTEGER (SQLite). Boolean = INTEGER (0/1).

Смотри полную схему: `docs/db-schema.sql`

---

## Phase 1 (доделать если не закончено)

- [ ] `src/rag/retriever.py` — функция `retrieve(query, top_k)` поверх Chroma
- [ ] `src/rules/engine.py` — функция `evaluate(profile)` → обязательства
- [ ] Тесты для обоих

---

## Phase 2 — Auth DB + расширение схемы

Ты делаешь первым — Даурен и Димаш зависят от твоих таблиц.

### 2.1 — Таблица `users`
- [ ] Создать `migrations/0003_add_users.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email ON users(email);
  ```
- [ ] Добавить `bcrypt` в `requirements.txt`

### 2.2 — Обновить `chat_sessions`
- [ ] Создать `migrations/0004_sessions_user_id_title.sql`:
  ```sql
  ALTER TABLE chat_sessions ADD COLUMN user_id TEXT REFERENCES users(id);
  ALTER TABLE chat_sessions ADD COLUMN title TEXT;
  CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(user_id);
  ```

### 2.3 — Обновить `taxpayer_profiles`
- [ ] Создать `migrations/0005_profiles_user_id.sql`:
  ```sql
  ALTER TABLE taxpayer_profiles ADD COLUMN user_id TEXT REFERENCES users(id);
  ```
  - `user_id` = новый primary lookup (один профиль на юзера)
  - `session_id` оставить nullable для совместимости

### 2.4 — Таблица `error_logs`
- [ ] Создать `migrations/0006_error_logs.sql`:
  ```sql
  CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    session_id TEXT,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
  );
  ```

### 2.5 — Новые CRUD в `database.py`
- [ ] `create_user(user_id, email, password_hash, name)` → INSERT users
- [ ] `get_user_by_email(email)` → SELECT users WHERE email
- [ ] `get_user_by_id(user_id)` → SELECT users WHERE id
- [ ] Обновить `create_session(session_id, user_id, created_at)` — добавить `user_id`
- [ ] `update_session_title(session_id, title)` → UPDATE chat_sessions SET title
- [ ] `get_sessions_by_user(user_id)` → SELECT chat_sessions WHERE user_id ORDER BY created_at DESC
- [ ] `get_or_create_profile_by_user(user_id)` → SELECT or INSERT taxpayer_profiles
- [ ] `update_profile_by_user(user_id, fields_dict)` → UPDATE taxpayer_profiles WHERE user_id
- [ ] `insert_error_log(...)` → INSERT error_logs

### 2.6 — Обновить DDL в `init_db()`
- [ ] Добавить все новые таблицы в `_DDL` строку в `database.py`
- [ ] Чтобы при `init_db()` на чистой базе создались все таблицы

### 2.7 — Seed тестового юзера
- [ ] Создать `migrations/seed_test_user.py` (или SQL):
  - email: `test@mail.com`
  - password: `123` (bcrypt hash)
  - name: `Test User`
  - Генерация хэша: `python -c "import bcrypt; print(bcrypt.hashpw(b'123', bcrypt.gensalt()).decode())"`

### 2.8 — Обновить `docs/db-schema.sql`
- [ ] Уже обновлён тимлидом — проверь что твой DDL в `database.py` совпадает с `docs/db-schema.sql`
