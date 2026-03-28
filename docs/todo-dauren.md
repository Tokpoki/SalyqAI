# TODO — Даурен (API Orchestrator)

Твоя зона: `backend/api_orchestrator/`

---

## Что изменилось в api.yaml (v0.2.0 → v0.3.0)

Тимлид обновил `docs/api.yaml`. Вот что добавлено — чтобы ты знал что реализовывать:

**Новые эндпоинты:**
- `POST /api/v1/auth/register` — регистрация (без токена)
- `POST /api/v1/auth/login` — вход (без токена)
- `POST /api/v1/auth/refresh` — обновить access token (без токена)
- `GET /api/v1/auth/me` — инфо о юзере + профиль (нужен токен)
- `GET /api/v1/chat/sessions` — список чатов юзера для sidebar (нужен токен)
- `GET /api/v1/user/profile` — профиль юзера (нужен токен)
- `PATCH /api/v1/user/profile` — обновить профиль (нужен токен)

**Новые schemas:**
- `RegisterRequest` — `{email, password, name, profile?}`
- `LoginRequest` — `{email, password}`
- `RefreshRequest` — `{refresh_token}`
- `AuthResponse` — `{user_id, email, name, access_token, refresh_token}`
- `UserInfo` — `{user_id, email, name, profile}`
- `SessionSummary` — `{id, title, created_at, updated_at}` (для списка в sidebar)

**Изменённые schemas:**
- `Session` — добавлены `user_id`, `title`
- `Profile` — теперь `user_id` вместо `session_id`
- `FeedbackRequest` — добавлен `session_id` в required

**Безопасность:**
- Глобальный `security: BearerAuth` — все эндпоинты требуют JWT по умолчанию
- `security: []` на auth endpoints + health + knowledge/versions = без токена
- 403 добавлен на `GET /sessions/{id}` и `POST /sessions/{id}/messages` (чужая сессия)

---

## Phase 1 (доделать если не закончено)

- [ ] Привести ответы в соответствие с `docs/api.yaml`
- [ ] Загрузка конфига из `.env` (`python-dotenv`)
- [ ] LLM: system prompt + вызов Gemini
- [ ] Оркестрация: RAG → Rules → Gemini → ответ

---

## Phase 2 — Auth + Multi-chat + Profile

Ты зависишь от Магжана (ему нужны таблицы `users`, обновлённые `chat_sessions`). Начни с auth модуля пока он доделывает.

### 2.1 — Auth модуль
- [ ] Добавить в `requirements.txt`: `bcrypt`, `PyJWT`
- [ ] Скопировать `.env.example` → `.env`, заполнить `JWT_SECRET` (любая строка)
- [ ] Создать `src/auth/__init__.py`
- [ ] Создать `src/auth/password.py`:
  - `hash_password(plain: str) -> str` — bcrypt
  - `verify_password(plain: str, hashed: str) -> bool`
- [ ] Создать `src/auth/jwt_utils.py`:
  - `create_access_token(user_id: str) -> str` — PyJWT, exp = `JWT_ACCESS_EXPIRE_MINUTES`
  - `create_refresh_token(user_id: str) -> str` — exp = `JWT_REFRESH_EXPIRE_DAYS`
  - `decode_token(token: str) -> dict` — raises на expired/invalid

### 2.2 — Auth эндпоинты
- [ ] Создать `src/routes/auth.py` с роутером prefix `/api/v1/auth`
- [ ] `POST /register`:
  - Body: `{email, password, name, profile?}`
  - Валидация: email формат, password не пустой, name не пустой
  - Проверка: email уже есть? → 409
  - Хэшировать пароль, создать user в БД
  - Если `profile` передан — создать/обновить `taxpayer_profiles`
  - Вернуть: `{user_id, email, name, access_token, refresh_token}`
- [ ] `POST /login`:
  - Body: `{email, password}`
  - Проверить credentials → 401 если неверно
  - Вернуть: `{user_id, email, name, access_token, refresh_token}`
- [ ] `POST /refresh`:
  - Body: `{refresh_token}`
  - Валидировать refresh token → выдать новую пару
- [ ] `GET /me`:
  - Требует Bearer token
  - Вернуть: `{user_id, email, name, profile}`
- [ ] Подключить `auth_router` в `main.py`

### 2.3 — JWT middleware
- [ ] Создать `src/auth/dependencies.py`:
  - `get_current_user(request) -> dict` — FastAPI `Depends`
  - Извлечь Bearer token из заголовка `Authorization`
  - Декодировать, вернуть user dict
  - 401 если нет/невалидный/expired
- [ ] Применить `Depends(get_current_user)` ко всем `/api/v1/chat/*` routes
- [ ] НЕ применять к: `/api/v1/health`, `/api/v1/auth/*`

### 2.4 — Обновить chat routes
- [ ] `POST /sessions` — записывать `user_id` из токена
- [ ] `GET /sessions/{id}` — проверять что сессия принадлежит юзеру (403 если нет)
- [ ] `POST /sessions/{id}/messages` — то же самое
- [ ] **Новый:** `GET /api/v1/chat/sessions` — список всех сессий юзера (для sidebar):
  ```json
  {"sessions": [{"id": "...", "title": "ИП налоги", "created_at": "..."}]}
  ```

### 2.5 — Автоназвание чатов
- [ ] После первого user message в сессии → вызвать Gemini:
  ```
  "Дай название 3-5 слов на русском для чата, начавшегося с: '{user_message}'. Верни только название."
  ```
- [ ] Сохранить через `update_session_title(session_id, title)`
- [ ] Делать async (fire-and-forget) — не блокировать основной ответ

### 2.6 — Profile эндпоинты (привязка к user, не session)
- [ ] `GET /api/v1/user/profile` — профиль текущего юзера
- [ ] `PATCH /api/v1/user/profile` — обновить поля профиля
- [ ] LLM fact extraction (позже): Gemini определяет из чата "я сменил режим" → авто-обновление профиля

### 2.7 — Error logging
- [ ] Создать `src/utils/error_logger.py`:
  - `log_error(user_id, session_id, error_type, message, stack)` → вызывает `insert_error_log()` от Магжана
- [ ] Обернуть `send_message` pipeline в try/except, логировать ошибки
- [ ] Python `logging` в stdout

### 2.8 — Обновить `docs/api.yaml`
- [ ] Уже обновлён тимлидом — проверь что твои эндпоинты точно совпадают
