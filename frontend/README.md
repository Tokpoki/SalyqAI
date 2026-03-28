# Frontend (Димаш)

React-приложение — чат-интерфейс Salyq AI.

## Запуск

```bash
cd frontend/app
npm install
npm run dev
```

Открыть http://localhost:3000

## Что внутри

- Три мок-сценария: ИП упрощёнка, аренда, программист
- Переключатель сценариев в шапке
- Левая панель: профиль налогоплательщика
- Центр: чат с Salyq AI
- Правая панель: обязательства + ссылки на статьи НК РК

## Backend API

Бэкенд на http://localhost:8000. Контракт: `docs/api.yaml`

## Целевой стек

TypeScript + Tailwind CSS + shadcn/ui + TanStack Query
