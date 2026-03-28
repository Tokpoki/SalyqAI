# Туториал для Димаша — Frontend

## Что ты делаешь

Ты делаешь **весь UI** — от landing page до чата. Интерфейс как у ChatGPT: sidebar с чатами слева, чат по центру, минималистичный дизайн.

## Стек

| Инструмент | Зачем |
|---|---|
| **TypeScript** | Ловит ошибки до запуска |
| **Tailwind CSS** | Стили через классы (`className="bg-white p-4"`) |
| **shadcn/ui** | Готовые компоненты (Button, Input, Card, Skeleton) |
| **React Router** | Навигация между страницами |
| **TanStack Query** | Работа с API (загрузка, кеш, loading) |
| **framer-motion** | Анимации |
| **lucide-react** | Иконки |

## Установка

```bash
cd frontend/app

# Tailwind
npm install -D tailwindcss postcss autoprefixer
npx tailwindcss init -p

# shadcn/ui
npx shadcn-ui@latest init

# Остальное
npm install react-router-dom @tanstack/react-query framer-motion lucide-react
```

## Структура (Phase 2)

```
frontend/app/src/
├── main.tsx                    ← entry point
├── App.tsx                     ← routes
├── api/
│   ├── client.ts               ← базовый fetch + Bearer token
│   ├── auth.ts                 ← register, login, refresh, getMe
│   ├── chat.ts                 ← listSessions, createSession, sendMessage
│   └── profile.ts              ← getProfile, updateProfile
├── lib/
│   └── auth.ts                 ← localStorage: getToken, setTokens, clearTokens
├── components/
│   ├── ProtectedRoute.tsx       ← redirect если нет токена
│   ├── Sidebar.tsx              ← список чатов + "Новый чат"
│   ├── ChatMessage.tsx          ← один пузырь сообщения
│   ├── ChatInput.tsx            ← input + кнопка отправки
│   ├── ObligationsInline.tsx    ← обязательства внутри ответа бота
│   └── CitationsInline.tsx      ← цитаты внутри ответа бота
├── pages/
│   ├── LandingPage.tsx          ← описание + форма входа
│   ├── LoginPage.tsx
│   ├── RegisterPage.tsx         ← 2 шага: credentials → profile
│   ├── ChatPage.tsx             ← sidebar + чат
│   └── SettingsPage.tsx         ← профиль + logout
```

## Как подключить API

Backend работает на http://localhost:8000. Используй `VITE_API_URL` из `.env`.

```typescript
// src/api/client.ts
const API = import.meta.env.VITE_API_URL;

export async function apiFetch(path: string, options: RequestInit = {}) {
  const token = localStorage.getItem('access_token');
  const res = await fetch(`${API}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
      ...options.headers,
    },
  });
  if (res.status === 401) {
    // Попробовать refresh, или redirect на /login
    localStorage.clear();
    window.location.href = '/login';
  }
  return res.json();
}

// src/api/auth.ts
export const login = (email: string, password: string) =>
  apiFetch('/api/v1/auth/login', {
    method: 'POST',
    body: JSON.stringify({ email, password }),
  });

// src/api/chat.ts
export const listSessions = () => apiFetch('/api/v1/chat/sessions');
export const createSession = () => apiFetch('/api/v1/chat/sessions', { method: 'POST' });
export const sendMessage = (sessionId: string, text: string) =>
  apiFetch(`/api/v1/chat/sessions/${sessionId}/messages`, {
    method: 'POST',
    body: JSON.stringify({ text }),
  });
```

## Дизайн

**Стиль:** чистый минимализм. Vercel / Linear вдохновение.
- Белый фон, серые borders (1px)
- Один акцент: blue-600
- Много пустого пространства (padding)
- Subtle shadows, нет ярких цветов
- Плавные анимации (framer-motion)

## Страницы

### Landing (`/`)
- Слева: "Salyq AI" + описание + 3 фичи
- Справа: форма входа (email + пароль + кнопка "Войти")
- Если залогинен → redirect `/chat`

### Register (`/register`)
- Шаг 1: email, пароль, ФИО → "Далее"
- Шаг 2: профиль (всё скипаемое) → "Готово" или "Пропустить"
- → redirect `/chat`

### Chat (`/chat`)
```
┌──────────┬──────────────────────────────┐
│ Salyq AI │  Чат: ИП налоги              │
│          │                              │
│ + Новый  │  [user] Какие налоги...      │
│          │  [bot]  Согласно ст.686..    │
│ Сегодня  │    📋 3 обязательства ▼      │
│  ИП      │    📎 2 статьи ▼             │
│  Аренда  │                              │
│          │  ┌────────────────────────┐   │
│ ⚙ Настр. │  │ Введите вопрос...    ➤ │   │
│          │  └────────────────────────┘   │
└──────────┴──────────────────────────────┘
```

## Git

```bash
git checkout main && git pull
git checkout -b dimash/task-name
git add frontend/
git commit -m "feat: add chat page"
git push -u origin dimash/task-name
```

## Чего НЕ делать

- Не трогай `backend/`
- Не меняй `docs/api.yaml` без обсуждения
