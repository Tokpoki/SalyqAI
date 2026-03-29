# Salyq AI — Архитектура системы

## Общая схема

```mermaid
graph LR
    U([Пользователь]) --> F

    subgraph F[Frontend]
        F1[React 18 + TypeScript]
        F2[Vite + Tailwind CSS]
    end

    F -->|REST API + JWT| B

    subgraph B[Backend — FastAPI]
        B1[Auth]
        B2[Chat]
        B3[Profile]
        B4[Knowledge]
    end

    B2 --> P

    subgraph P[LLM Pipeline]
        P1[Query Expand] --> P2[RAG Search] --> P3[GPT-4o-mini] --> P4[JSON Parse]
    end

    P2 --> C[(ChromaDB<br/>1700+ статей)]
    B1 --> S[(SQLite)]
    B3 --> S
    P --> S
```

## Поток обработки запроса

```mermaid
sequenceDiagram
    actor U as Пользователь
    participant F as Frontend
    participant API as FastAPI
    participant DB as SQLite
    participant RAG as ChromaDB
    participant AI as OpenAI

    U->>F: Вопрос о налогах
    F->>API: POST /api/v1/chat/send
    API->>DB: Загрузка профиля
    API->>API: Query Expand
    API->>RAG: Семантический поиск
    RAG-->>API: Статьи НК РК
    API->>AI: Промпт + статьи + профиль
    AI-->>API: Ответ с цитатами
    API->>DB: Сохранение
    API-->>F: JSON Response
    F-->>U: Ответ со ссылками на статьи
```

## Стек технологий

| Слой | Технологии |
|------|-----------|
| **Frontend** | React 18, TypeScript, Vite, Tailwind CSS, Framer Motion |
| **Backend** | FastAPI, Python 3.13, Uvicorn |
| **AI / ML** | OpenAI GPT-4o-mini, ChromaDB, SentenceTransformers (multilingual-e5-large) |
| **Auth** | JWT (PyJWT), bcrypt |
| **Data** | SQLite, 1700+ статей Налогового кодекса РК |
| **DevOps** | Docker, Docker Compose, Nginx |
