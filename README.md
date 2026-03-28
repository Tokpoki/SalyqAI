<div align="center">

# ⚖️ Salyq AI

### AI-powered Tax Consultant for Kazakhstan

**Задайте вопрос на простом языке — получите точный ответ со ссылками на Налоговый кодекс РК**

[![FastAPI](https://img.shields.io/badge/FastAPI-0.115-009688?style=for-the-badge&logo=fastapi&logoColor=white)](https://fastapi.tiangolo.com)
[![React](https://img.shields.io/badge/React-18.3-61DAFB?style=for-the-badge&logo=react&logoColor=black)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-6.0-3178C6?style=for-the-badge&logo=typescript&logoColor=white)](https://typescriptlang.org)
[![OpenAI](https://img.shields.io/badge/OpenAI-GPT--4o-412991?style=for-the-badge&logo=openai&logoColor=white)](https://openai.com)
[![Tailwind](https://img.shields.io/badge/Tailwind-3.4-06B6D4?style=for-the-badge&logo=tailwindcss&logoColor=white)](https://tailwindcss.com)

<br/>

<img src="https://img.shields.io/badge/Налоговый_кодекс_РК-1700+_статей-059669?style=flat-square" />
<img src="https://img.shields.io/badge/Время_ответа-<5_сек-0d9488?style=flat-square" />
<img src="https://img.shields.io/badge/RAG-ChromaDB-0ea5e9?style=flat-square" />

</div>

---

## 📋 О проекте

**Salyq AI** — это интеллектуальный налоговый консультант, который помогает гражданам и предпринимателям Казахстана разбираться в налоговом законодательстве. Система использует RAG (Retrieval-Augmented Generation) для поиска по Налоговому кодексу РК и генерации точных ответов с цитированием конкретных статей.

### Ключевые возможности

- 🔍 **Поиск по НК РК** — мгновенный поиск по 1700+ статьям Налогового кодекса
- 📋 **Налоговые обязательства** — автоматическое определение сроков, сумм и кодов
- 📜 **Ссылки на закон** — каждый ответ подкреплён конкретными статьями
- 👤 **Персонализация** — ответы учитывают профиль налогоплательщика (ИП, ТОО, физлицо)
- 💬 **История чатов** — сохранение диалогов с возможностью продолжить
- 🌙 **Тёмная тема** — полная поддержка dark mode

---

## 🏗️ Архитектура

```
┌─────────────────────────────────────────────────────────────────┐
│                         Frontend                                │
│                                                                 │
│   React 18 · TypeScript · Vite · Tailwind CSS · Framer Motion  │
│                                                                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│   │ Landing  │  │  Login / │  │   Chat   │  │   Settings   │  │
│   │  Page    │  │ Register │  │   Page   │  │     Page     │  │
│   └──────────┘  └──────────┘  └──────────┘  └──────────────┘  │
│                        │                                        │
│                   apiFetch()                                    │
│              (JWT auto-refresh)                                 │
└────────────────────────┬────────────────────────────────────────┘
                         │ REST API
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                    API Orchestrator                              │
│                      FastAPI                                    │
│                                                                 │
│   ┌──────────┐  ┌──────────┐  ┌──────────┐  ┌──────────────┐  │
│   │   Auth   │  │   Chat   │  │ Profile  │  │   Knowledge  │  │
│   │  Routes  │  │  Routes  │  │  Routes  │  │    Routes    │  │
│   └────┬─────┘  └────┬─────┘  └────┬─────┘  └──────────────┘  │
│        │             │             │                            │
│   ┌────▼─────┐  ┌────▼─────────────▼───┐                      │
│   │   JWT    │  │    LLM Pipeline      │                      │
│   │  Auth    │  │                      │                      │
│   │(bcrypt)  │  │  ┌───────────────┐   │                      │
│   └──────────┘  │  │ Query Expand  │   │                      │
│                 │  │  (synonyms)   │   │                      │
│                 │  └───────┬───────┘   │                      │
│                 │          ▼           │                      │
│                 │  ┌───────────────┐   │                      │
│                 │  │  RAG Search   │   │                      │
│                 │  │  (ChromaDB)   │   │                      │
│                 │  └───────┬───────┘   │                      │
│                 │          ▼           │                      │
│                 │  ┌───────────────┐   │                      │
│                 │  │   OpenAI      │   │                      │
│                 │  │  GPT-4o-mini  │   │                      │
│                 │  └───────┬───────┘   │                      │
│                 │          ▼           │                      │
│                 │  ┌───────────────┐   │                      │
│                 │  │  JSON Parse   │   │                      │
│                 │  │ & Normalize   │   │                      │
│                 │  └───────────────┘   │                      │
│                 └──────────────────────┘                      │
└────────────────────────┬────────────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Data Layer                                 │
│                                                                 │
│   ┌─────────────────────┐      ┌────────────────────────────┐  │
│   │      SQLite          │      │        ChromaDB            │  │
│   │                      │      │                            │  │
│   │  • users             │      │  Collection:               │  │
│   │  • chat_sessions     │      │  rk_tax_code_2026_         │  │
│   │  • chat_messages     │      │  articles_e5_large         │  │
│   │  • taxpayer_profiles │      │                            │  │
│   │  • extracted_facts   │      │  Embeddings:               │  │
│   │  • answer_citations  │      │  multilingual-e5-large     │  │
│   │  • feedback          │      │                            │  │
│   │  • error_logs        │      │  1700+ статей НК РК        │  │
│   └─────────────────────┘      └────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛠️ Стек технологий

### Backend

| Технология | Назначение |
|---|---|
| **FastAPI** | REST API фреймворк |
| **OpenAI API** | Генерация ответов (GPT-4o-mini) |
| **ChromaDB** | Векторная БД для RAG-поиска по НК РК |
| **SentenceTransformers** | Эмбеддинги (`multilingual-e5-large`) |
| **SQLite** | Основная база данных |
| **PyJWT + bcrypt** | Аутентификация (JWT tokens) |
| **Uvicorn** | ASGI-сервер |

### Frontend

| Технология | Назначение |
|---|---|
| **React 18** | UI-фреймворк |
| **TypeScript** | Типизация |
| **Vite** | Сборка и dev-сервер |
| **Tailwind CSS** | Стилизация (emerald-teal градиенты) |
| **Framer Motion** | Анимации и переходы |
| **React Router 7** | Маршрутизация |
| **TanStack React Query** | Кэширование данных |
| **Lucide React** | Иконки |

---

## 📁 Структура проекта

```
Salyq-AI/
├── backend/
│   ├── api_orchestrator/          # FastAPI приложение
│   │   ├── src/
│   │   │   ├── main.py           # Точка входа, CORS, роутеры
│   │   │   ├── config.py         # Конфигурация из .env
│   │   │   ├── routes/
│   │   │   │   ├── auth.py       # Регистрация, логин, JWT
│   │   │   │   ├── chat.py       # Сессии, сообщения, RAG + LLM
│   │   │   │   └── profile.py    # Профиль налогоплательщика
│   │   │   ├── auth/
│   │   │   │   ├── jwt_utils.py  # Создание/валидация токенов
│   │   │   │   ├── password.py   # Хеширование паролей
│   │   │   │   └── dependencies.py
│   │   │   └── llm/
│   │   │       ├── client.py     # OpenAI клиент, парсинг JSON
│   │   │       └── prompt.py     # Системный промпт на русском
│   │   └── requirements.txt
│   │
│   └── data_rag_rules/            # RAG и работа с данными
│       ├── src/
│       │   ├── db/database.py    # SQLite операции + миграции
│       │   └── rag/retriever.py  # ChromaDB поиск + эмбеддинги
│       └── requirements.txt
│
├── frontend/
│   └── app/
│       ├── src/
│       │   ├── pages/            # Страницы приложения
│       │   ├── components/       # UI-компоненты
│       │   ├── api/              # HTTP-клиент с auto-refresh
│       │   └── lib/              # Утилиты
│       ├── package.json
│       └── tailwind.config.js
│
├── migrations/                    # SQL-миграции (0001–0009)
├── chroma/                        # ChromaDB хранилище
└── docs/                          # Документация
```

---

## 🗄️ Схема базы данных

```sql
users                    chat_sessions              chat_messages
┌──────────────┐        ┌──────────────────┐       ┌─────────────────┐
│ id (PK)      │───┐    │ id (PK)          │───┐   │ id (PK)         │
│ email        │   │    │ user_id (FK)     │   │   │ session_id (FK) │
│ password_hash│   └───>│ title            │   └──>│ role            │
│ name         │        │ status           │       │ content         │
│ created_at   │        │ knowledge_version│       │ advice_json     │
└──────────────┘        │ created_at       │       │ confidence      │
                        │ updated_at       │       │ created_at      │
       ┌────────────┐   └──────────────────┘       └─────────────────┘
       │ taxpayer_  │                                      │
       │ profiles   │         extracted_facts         answer_citations
       ├────────────┤        ┌──────────────┐       ┌──────────────┐
       │ id (PK)    │        │ id (PK)      │       │ id (PK)      │
       │ user_id(FK)│        │ session_id   │       │ message_id   │
       │ taxpayer_  │        │ message_id   │       │ article_number│
       │  type      │        │ fact_key     │       │ article_title│
       │ tax_regime │        │ fact_value   │       │ snippet      │
       │ annual_    │        │ confidence   │       │ score        │
       │  income_kzt│        │ created_at   │       │ created_at   │
       │ activity_  │        └──────────────┘       └──────────────┘
       │  type      │
       │ has_rental │
       │ has_foreign│
       └────────────┘
```

---

## 🔌 API Endpoints

### Auth — `/api/v1/auth`

| Method | Endpoint | Описание |
|--------|----------|----------|
| `POST` | `/auth/register` | Регистрация (email, password, name) |
| `POST` | `/auth/login` | Вход → `access_token` + `refresh_token` |
| `POST` | `/auth/refresh` | Обновление access token |
| `GET` | `/auth/me` | Текущий пользователь + профиль |

### Chat — `/api/v1/chat`

| Method | Endpoint | Описание |
|--------|----------|----------|
| `GET` | `/sessions` | Список чатов пользователя |
| `POST` | `/sessions` | Создать новый чат |
| `GET` | `/sessions/{id}` | Получить чат с сообщениями |
| `DELETE` | `/sessions/{id}` | Удалить чат |
| `POST` | `/sessions/{id}/messages` | Отправить сообщение → AI-ответ |

### Profile — `/api/v1/user`

| Method | Endpoint | Описание |
|--------|----------|----------|
| `GET` | `/user/profile` | Получить профиль налогоплательщика |
| `PATCH` | `/user/profile` | Обновить профиль |

---

## 💬 Как работает чат

```
Пользователь                  Backend                         LLM
     │                           │                              │
     │  "Какой налог платит      │                              │
     │   ИП на упрощёнке?"       │                              │
     │ ─────────────────────────>│                              │
     │                           │                              │
     │                           │  1. Expand query:            │
     │                           │     "упрощёнк" → "СНР",     │
     │                           │     "декларация"             │
     │                           │                              │
     │                           │  2. RAG Search (ChromaDB):   │
     │                           │     → Ст. 683, 687, 688     │
     │                           │                              │
     │                           │  3. Load user profile:       │
     │                           │     → ИП, упрощёнка          │
     │                           │                              │
     │                           │  4. Build prompt ──────────> │
     │                           │     (system + user + RAG     │
     │                           │      + profile + history)    │
     │                           │                              │
     │                           │  5. Parse JSON <──────────── │
     │                           │     {answer, citations,      │
     │                           │      obligations, plan}      │
     │                           │                              │
     │  Structured response      │                              │
     │ <─────────────────────────│                              │
     │                           │                              │
     │  • Ответ с расчётом       │                              │
     │  • Ст. 687 НК РК         │                              │
     │  • План действий          │                              │
     │  • Обязательства          │                              │
```

---

## 🚀 Запуск

### Требования

- Python 3.11+
- Node.js 18+
- OpenAI API Key

### Backend

```bash
# Установка зависимостей
cd backend/api_orchestrator
pip install -r requirements.txt

cd ../data_rag_rules
pip install -r requirements.txt

# Настройка окружения
cd ../api_orchestrator
cp .env.example .env
# Заполните OPENAI_API_KEY, JWT_SECRET

# Запуск
uvicorn src.main:app --host 0.0.0.0 --port 8000
```

### Frontend

```bash
cd frontend/app
npm install

# Настройка
cp .env.example .env
# VITE_API_URL=http://localhost:8000

# Запуск
npm run dev
```

Приложение будет доступно на `http://localhost:3000`

---

## 🎨 Дизайн

Интерфейс выполнен в **emerald-teal** градиентной палитре с поддержкой тёмной темы:

- **Gradient accents** — `#059669` → `#0D9488` → `#0EA5E9`
- **Glassmorphism** — полупрозрачные навбары с backdrop-blur
- **Micro-interactions** — hover scale, smooth transitions
- **Scroll animations** — Framer Motion `useInView` + `useScroll`
- **Inter** — основной шрифт

---

## 👥 Команда

| Участник | Роль |
|----------|------|
| **Орынтай** | Team Lead, Backend Architecture |
| **Даурен** | Backend API & Auth |
| **Димаш** | Frontend Development |
| **Магжан** | Database & RAG Pipeline |

---

<div align="center">

**Salyq AI** — делаем налоги понятными для каждого 🇰🇿

</div>
