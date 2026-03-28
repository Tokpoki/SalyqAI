# Туториал для Даурена — API Orchestrator

## Что ты делаешь

Ты пишешь **API + auth + LLM**. Фронтенд общается с твоим сервером. Ты проверяешь кто юзер (JWT), принимаешь вопрос, ищешь статьи (через модуль Магжана), считаешь обязательства, вызываешь Gemini, возвращаешь ответ.

## Твоя папка

```
backend/api_orchestrator/
├── src/
│   ├── main.py              ← FastAPI app
│   ├── routes/
│   │   ├── auth.py          ← регистрация, логин, refresh, me
│   │   └── chat.py          ← сессии, сообщения
│   ├── auth/
│   │   ├── password.py      ← bcrypt хэширование
│   │   ├── jwt_utils.py     ← создание/проверка JWT
│   │   └── dependencies.py  ← get_current_user() для Depends
│   ├── llm/
│   │   ├── prompt.py        ← system prompt для Gemini
│   │   └── client.py        ← вызов Gemini API
│   └── utils/
│       └── error_logger.py  ← логирование ошибок
├── .env.example
├── requirements.txt
└── tests/
```

## Как запустить

```bash
cd backend/api_orchestrator
cp .env.example .env         # заполни GEMINI_API_KEY, JWT_SECRET
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

Swagger UI: http://localhost:8000/docs

## Auth — как работает

1. Юзер регистрируется → ты хэшируешь пароль bcrypt → сохраняешь в БД → выдаёшь JWT
2. JWT = access_token (30 мин) + refresh_token (7 дней)
3. Фронт шлёт `Authorization: Bearer <access_token>` в каждом запросе
4. Ты декодируешь токен → получаешь `user_id` → знаешь кто просит

### Пример кода JWT

```python
import jwt
from datetime import datetime, timedelta

def create_access_token(user_id: str) -> str:
    payload = {
        "sub": user_id,
        "exp": datetime.utcnow() + timedelta(minutes=30),
        "type": "access"
    }
    return jwt.encode(payload, JWT_SECRET, algorithm="HS256")
```

### Пример FastAPI Depends

```python
from fastapi import Depends, HTTPException, Request

def get_current_user(request: Request) -> dict:
    token = request.headers.get("Authorization", "").replace("Bearer ", "")
    if not token:
        raise HTTPException(401, "Token missing")
    try:
        payload = jwt.decode(token, JWT_SECRET, algorithms=["HS256"])
        return {"user_id": payload["sub"]}
    except jwt.ExpiredSignatureError:
        raise HTTPException(401, "Token expired")

# Использование:
@router.post("/sessions")
def create_session(user=Depends(get_current_user)):
    user_id = user["user_id"]
    ...
```

## LLM — Gemini

```python
import google.generativeai as genai
genai.configure(api_key=GEMINI_API_KEY)
model = genai.GenerativeModel("gemini-1.5-flash")
response = model.generate_content([system_prompt, user_message])
```

## Контракт

Все эндпоинты: `docs/api.yaml`. Если меняешь формат — обнови api.yaml и предупреди Димаша.

## Git

```bash
git checkout main && git pull
git checkout -b dauren/task-name
# работа...
git add backend/api_orchestrator/
git commit -m "feat: add auth endpoints"
git push -u origin dauren/task-name
```

## Чего НЕ делать

- Не трогай `backend/data_rag_rules/` — Магжан
- Не трогай `frontend/` — Димаш
- Не меняй `docs/db-schema.sql` — Магжан
