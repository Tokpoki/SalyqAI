# Salyq AI — Командный гайд

Этот файл — единственное место, которое должен прочитать каждый участник команды.

---

## Что мы строим

Чат-бот, который помогает казахстанцам разобраться в налогах. Пользователь пишет вопрос → система ищет статьи НК РК → определяет обязательства → отвечает со ссылками на закон.

## Кто что читает

| Человек | Прочитай обязательно | Туториал | Задачи |
|---------|---------------------|----------|--------|
| **Все** | Этот файл + `docs/api.yaml` | — | — |
| **Даурен** | `backend/api_orchestrator/README.md` | `backend/api_orchestrator/tutorial-dauren.md` | `docs/todo-dauren.md` |
| **Магжан** | `backend/data_rag_rules/README.md` | `backend/data_rag_rules/tutorial-magzhan.md` | `docs/todo-magzhan.md` |
| **Димаш** | `frontend/README.md` | `frontend/tutorial-dimash.md` | `docs/todo-dimash.md` |

**Не нужно** читать чужие туториалы и TODO — они про чужую зону.

---

## Карта файлов проекта

```
docs/
├── api.yaml              ← КОНТРАКТ API (источник правды!)
├── db-schema.sql         ← целевая схема БД
├── todo-dauren.md        ← задачи Даурена
├── todo-magzhan.md       ← задачи Магжана
└── todo-dimash.md        ← задачи Димаша

backend/
├── api_orchestrator/     ← Даурен: API + оркестрация
│   ├── src/main.py
│   ├── src/routes/chat.py
│   ├── tutorial-dauren.md
│   └── README.md
└── data_rag_rules/       ← Магжан: БД + RAG + правила
    ├── src/db/database.py
    ├── src/rag/           ← TODO
    ├── src/rules/         ← TODO
    ├── tutorial-magzhan.md
    └── README.md

frontend/                 ← Димаш: UI
├── app/src/...
├── tutorial-dimash.md
└── README.md

chroma/                   ← готовая Chroma vector DB (844 статьи НК РК)
rk_tax_code_2026_articles.json   ← все статьи в JSON
parse_tax_code_to_chroma.py      ← скрипт парсинга (уже отработал)
```

---

## Сущности (главные объекты системы)

### 1. Session (сессия чата)
Один разговор пользователя с ботом. Создаётся при старте чата.
```
{ id: uuid, status: "active", created_at: datetime }
```

### 2. Message (сообщение)
Одно сообщение в сессии. Роль: `user` или `assistant`.
```
{ id: uuid, session_id: uuid, role: "user"|"assistant", content: text }
```

### 3. Profile (профиль налогоплательщика)
Данные о пользователе, собранные за сессию: тип (ИП/физлицо), режим, доход.
```
{ session_id, taxpayer_type, tax_regime, annual_income_kzt, has_rental_income, ... }
```

### 4. Obligation (обязательство)
Что должен сдать/заплатить налогоплательщик: форма, дедлайн, основание.
```
{ code: "FORM_910_00", title: "Декларация 910.00", due_date_rule: "До 15 авг", basis: "ст. 686" }
```

### 5. Citation (ссылка на статью)
Ссылка на конкретную статью НК РК в ответе.
```
{ article_number: "686", article_title: "Упрощённая декларация", snippet: "текст..." }
```

### 6. Feedback (обратная связь)
Лайк/дизлайк на ответ бота.
```
{ session_id, message_id, rating: "up"|"down", reason: "неточный ответ" }
```

---

## API контракт — `docs/api.yaml`

Это "договор" между фронтендом и бэкендом. В нём описано:
- Какие эндпоинты существуют
- Какие данные принимают
- Какие данные возвращают
- Точный формат каждого поля

### Текущие эндпоинты (работают)

| Метод | Путь | Что делает |
|-------|------|-----------|
| GET | `/api/v1/health` | Проверка что сервер жив |
| POST | `/api/v1/chat/sessions` | Создать сессию |
| GET | `/api/v1/chat/sessions/{id}` | Получить сессию + историю |
| POST | `/api/v1/chat/sessions/{id}/messages` | Отправить сообщение |

### Запланированные эндпоинты (ещё не реализованы)

| Метод | Путь | Кто делает |
|-------|------|-----------|
| PATCH | `/api/v1/chat/sessions/{id}/profile` | Даурен |
| POST | `/api/v1/feedback` | Даурен |
| GET | `/api/v1/knowledge/versions` | Даурен |
| POST | `/api/v1/rag/retrieve` | Магжан (функция) + Даурен (route) |
| POST | `/api/v1/rules/evaluate` | Магжан (функция) + Даурен (route) |

### Как добавить новый эндпоинт

Это командный процесс. Вот как он происходит:

1. **Кто-то говорит:** "Нам нужен эндпоинт для X"
2. **Обсуждаем втроём** (или в чате): какой путь, какие поля, какой формат
3. **Тимлид (или кто обсудил)** обновляет `docs/api.yaml` — добавляет новый path и schema
4. **Даурен** реализует эндпоинт в `backend/api_orchestrator/src/routes/`
5. **Димаш** подключает на фронте
6. **Магжан** добавляет нужные таблицы/функции если надо

**Важно:** никто не добавляет эндпоинт "молча". Сначала api.yaml, потом код.

---

## Как работать с Claude Code (AI-агентом)

Каждый из вас может использовать Claude Code для написания кода. Вот как правильно:

### Что скинуть агенту чтобы он понял контекст

Скопируй ему свой туториал + текущую задачу из TODO. Пример промпта:

**Даурен:**
```
Прочитай backend/api_orchestrator/tutorial-dauren.md и docs/todo-dauren.md.
Сделай задачу: "Добавить валидацию UUID в path-параметрах".
Работай только в backend/api_orchestrator/.
```

**Магжан:**
```
Прочитай backend/data_rag_rules/tutorial-magzhan.md и docs/todo-magzhan.md.
Сделай задачу: "Написать src/rag/retriever.py".
Chroma DB уже готова в chroma/, коллекция rk_tax_code_2026_articles_e5_large.
Работай только в backend/data_rag_rules/.
```

**Димаш:**
```
Прочитай frontend/tutorial-dimash.md и docs/todo-dimash.md.
Сделай задачу: "Подключить чат к реальному API на localhost:8000".
Работай только в frontend/.
```

### Правила для агента (добавляй в промпт)

```
Ограничения:
- Работай ТОЛЬКО в [твоя папка]
- Не меняй docs/api.yaml без моего разрешения
- Не трогай чужие папки
- Следуй контракту из docs/api.yaml
```

### Если агент хочет поменять что-то за пределами твоей зоны

Скажи ему "нет" и напиши тимлиду. Например:
- Магжан: агент хочет поменять routes → скажи "нет", это зона Даурена
- Димаш: агент хочет создать эндпоинт → скажи "нет", это зона Даурена
- Даурен: агент хочет менять схему БД → скажи "нет", это зона Магжана

---

## Git — как работать с ветками

### Золотое правило: НИКОГДА не пуш в main напрямую

```bash
# 1. Перед началом работы
git checkout main
git pull

# 2. Создать свою ветку
git checkout -b даурен/название-задачи    # Даурен
git checkout -b магжан/название-задачи    # Магжан
git checkout -b димаш/название-задачи     # Димаш

# 3. Делаешь работу...

# 4. Сохранить
git add backend/api_orchestrator/         # только свою папку!
git commit -m "feat: описание что сделал"
git push -u origin даурен/название-задачи

# 5. Создать Pull Request на GitHub
# main ← твоя-ветка
```

### Формат коммитов

```
feat: добавил эндпоинт профиля          ← новая функция
fix: исправил 404 при создании сессии    ← исправление бага
test: добавил тесты для retrieve          ← тесты
style: перевёл стили на Tailwind          ← визуальные изменения
```

---

## Запуск проекта

### Backend (терминал 1)
```bash
cd backend/api_orchestrator
pip install -r requirements.txt
uvicorn src.main:app --reload --port 8000
```

### Frontend (терминал 2)
```bash
cd frontend/app
npm install
npm run dev
```

### Проверить
- Фронтенд: http://localhost:3000
- Бэкенд: http://localhost:8000/docs (Swagger UI)

---

## Как устроен поток данных

```
Пользователь пишет: "Какие налоги платит ИП на упрощёнке?"
         │
         ▼
    [Фронтенд] POST /api/v1/chat/sessions/{id}/messages
         │
         ▼
    [Оркестратор — Даурен]
         │
         ├──→ [RAG — Магжан] retrieve("ИП упрощёнка") → статьи 683, 686, 687
         │
         ├──→ [Rules — Магжан] evaluate(profile) → форма 910, ОПВ, СО
         │
         ├──→ [LLM — Даурен] system prompt + статьи + правила → Claude API → ответ
         │
         └──→ Собрать финальный ответ: answer_text + citations + obligations
         │
         ▼
    [Фронтенд] показать ответ + обязательства + цитаты
```

Сейчас шаги RAG, Rules и LLM — заглушки. Магжан пишет RAG + Rules, Даурен пишет LLM-слой.

## Кто отвечает за "мозг" бота (LLM)

**Даурен** — он пишет:
- **System prompt** — инструкция для Gemini: "ты налоговый консультант, отвечай на основе статей НК РК, ссылайся на номера статей, не выдумывай"
- **Вызов Gemini API** — отправка prompt + контекст → получение ответа
- **Парсинг ответа** — Gemini вернёт текст, но API ожидает JSON с полями `answer_text`, `citations[]`, `obligations[]`, `confidence`. Нужно либо использовать JSON mode Gemini, либо промпт "верни в формате JSON"

**LLM = Google Gemini** (не Claude, не GPT). SDK: `google-generativeai`. Ключ: `GEMINI_API_KEY` в `.env`.

Файлы будут жить в `backend/api_orchestrator/src/llm/`:
- `prompt.py` — system prompt
- `client.py` — вызов Gemini API

System prompt — это НЕ код, а текст. Пример:
```
Ты — Salyq AI, налоговый консультант по законодательству Республики Казахстан.
Отвечай ТОЛЬКО на основе приложенных статей НК РК.
Всегда указывай номер статьи (например: "согласно ст. 686 НК РК").
Если не уверен — скажи "рекомендую уточнить у специалиста".
Язык: русский, простой и понятный.
```

Этот prompt будет дорабатываться итеративно — по мере тестирования качества ответов.

## Конфигурация (.env)

Каждый модуль имеет `.env.example`. Скопируй → `.env`, заполни.

- `backend/api_orchestrator/.env.example` — `GEMINI_API_KEY`, `DB_PATH`, `CHROMA_PATH`, ...
- `frontend/app/.env.example` — `VITE_API_URL`

**`.env` файлы НЕ коммитятся** (в .gitignore). Ключи API — секретные.
