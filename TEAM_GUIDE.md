# Salyq AI — Командный гайд

Этот файл — единственное место, которое должен прочитать каждый участник команды.

---

## Что мы строим

Чат-бот для казахстанцев по налогам. Пользователь регистрируется, заполняет профиль → задаёт вопрос → система ищет статьи НК РК, определяет обязательства → отвечает со ссылками на закон. Интерфейс как у ChatGPT: много чатов, sidebar, история.

## Кто что читает

| Человек | Туториал | Задачи |
|---------|----------|--------|
| **Все** | Этот файл + `docs/api.yaml` | — |
| **Даурен** | `backend/api_orchestrator/tutorial-dauren.md` | `docs/todo-dauren.md` |
| **Магжан** | `backend/data_rag_rules/tutorial-magzhan.md` | `docs/todo-magzhan.md` |
| **Димаш** | `frontend/tutorial-dimash.md` | `docs/todo-dimash.md` |

---

## Сущности

### User (пользователь)
```
{ id, email, password_hash, name, created_at }
```

### Session (сессия чата)
Один разговор. У каждого юзера может быть много сессий.
```
{ id, user_id, title, status, created_at }
```

### Message (сообщение)
```
{ id, session_id, role: "user"|"assistant", content, created_at }
```

### Profile (профиль налогоплательщика)
Один на юзера. Заполняется при регистрации, обновляется в настройках или из чата.
```
{ user_id, taxpayer_type, tax_regime, annual_income_kzt, activity_type, has_rental_income, has_foreign_income, ... }
```

### Obligation (обязательство)
```
{ code, title, due_date_rule, basis }
```

### Citation (ссылка на статью)
```
{ article_number, article_title, snippet }
```

---

## Эндпоинты API (v0.3.0)

### Auth (без токена)
| Метод | Путь | Что делает |
|-------|------|-----------|
| POST | `/api/v1/auth/register` | Регистрация (email, пароль, имя, профиль?) |
| POST | `/api/v1/auth/login` | Вход → access + refresh токены |
| POST | `/api/v1/auth/refresh` | Обновить access token |
| GET | `/api/v1/auth/me` | Инфо о текущем юзере + профиль |

### Chat (требует Bearer token)
| Метод | Путь | Что делает |
|-------|------|-----------|
| GET | `/api/v1/chat/sessions` | Список чатов юзера (для sidebar) |
| POST | `/api/v1/chat/sessions` | Создать чат |
| GET | `/api/v1/chat/sessions/{id}` | Чат + история сообщений |
| POST | `/api/v1/chat/sessions/{id}/messages` | Отправить сообщение |

### Profile (требует Bearer token)
| Метод | Путь | Что делает |
|-------|------|-----------|
| GET | `/api/v1/user/profile` | Профиль текущего юзера |
| PATCH | `/api/v1/user/profile` | Обновить профиль |

### Другие
| Метод | Путь | Что делает |
|-------|------|-----------|
| GET | `/api/v1/health` | Проверка (без токена) |
| POST | `/api/v1/feedback` | Лайк/дизлайк |

Полный контракт: `docs/api.yaml`

### Как работает Auth

1. Фронт отправляет `POST /auth/login` с email + пароль
2. Backend проверяет, возвращает `access_token` + `refresh_token`
3. Фронт сохраняет токены в localStorage
4. Все запросы к API идут с заголовком `Authorization: Bearer <access_token>`
5. Когда access_token истекает (30 мин) → фронт вызывает `POST /auth/refresh`
6. Если refresh тоже истёк → logout, redirect на login

### Тестовый аккаунт
- Email: `test@mail.com`
- Пароль: `123`

---

## Как устроен поток данных

```
Пользователь → Регистрация (email, пароль, профиль) → JWT токен
         │
         ▼
    Создаёт чат → Пишет вопрос
         │
         ▼
    [Frontend] POST /sessions/{id}/messages + Bearer token
         │
         ▼
    [API Orchestrator — Даурен]
         │
         ├──→ Проверить JWT → получить user_id
         ├──→ Загрузить профиль юзера из БД
         ├──→ [RAG — Магжан] retrieve() → статьи НК РК
         ├──→ [Rules — Магжан] evaluate(profile) → обязательства
         ├──→ [LLM — Даурен] system prompt + профиль + статьи + правила → Gemini → ответ
         ├──→ Автоназвание чата (первое сообщение)
         └──→ Сохранить в БД, вернуть ответ
         │
         ▼
    [Frontend] показать ответ + obligations + citations inline
```

## Кто отвечает за "мозг" бота (LLM)

**Даурен** — system prompt + вызов Gemini. SDK: `google-generativeai`. Ключ: `GEMINI_API_KEY` в `.env`.

Профиль юзера передаётся в prompt → Gemini знает кто спрашивает (ИП, физлицо и т.п.) → ответ персонализирован.

## Конфигурация (.env)

- `backend/api_orchestrator/.env.example` — `GEMINI_API_KEY`, `JWT_SECRET`, `DB_PATH`, ...
- `frontend/app/.env.example` — `VITE_API_URL`

`.env` файлы НЕ коммитятся. Ключи API — секретные.

---

## Как работать с агентами

Скопируй агенту свой туториал + задачу. Пример:

**Даурен:**
```
Прочитай backend/api_orchestrator/tutorial-dauren.md и docs/todo-dauren.md.
Сделай задачу: "2.2 — Auth эндпоинты".
Работай только в backend/api_orchestrator/.
```

**Магжан:**
```
Прочитай backend/data_rag_rules/tutorial-magzhan.md и docs/todo-magzhan.md.
Сделай задачу: "2.1 — Таблица users".
Работай только в backend/data_rag_rules/ и migrations/.
```

**Димаш:**
```
Прочитай frontend/tutorial-dimash.md и docs/todo-dimash.md.
Сделай задачу: "2.7 — Chat page".
Работай только в frontend/.
```

Если агент лезет за пределы твоей зоны — скажи "нет", напиши тимлиду.

---

## Git

```bash
git checkout main && git pull
git checkout -b имя/задача
# работа...
git add свою-папку/
git commit -m "feat: описание"
git push -u origin имя/задача
# → Pull Request на GitHub
```

**Никогда не пуш в main напрямую.**

---

## Запуск

```bash
# Backend (терминал 1)
cd backend/api_orchestrator
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000

# Frontend (терминал 2)
cd frontend/app
npm install && npm run dev
```

- Фронт: http://localhost:3000
- Backend Swagger: http://localhost:8000/docs
