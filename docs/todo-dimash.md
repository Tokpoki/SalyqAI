# TODO — Димаш (Frontend)

Твоя зона: `frontend/`

---

## Что изменилось в API (v0.2.0 → v0.3.0)

Теперь есть auth. Вот что тебе важно знать:

**Auth endpoints (без токена):**
- `POST /api/v1/auth/register` → `{email, password, name, profile?}` → `{access_token, refresh_token}`
- `POST /api/v1/auth/login` → `{email, password}` → `{access_token, refresh_token}`
- `POST /api/v1/auth/refresh` → `{refresh_token}` → новые токены
- `GET /api/v1/auth/me` → `{user_id, email, name, profile}` (нужен токен)

**Все остальные запросы** теперь требуют заголовок:
```
Authorization: Bearer <access_token>
```

**Новый endpoint для sidebar:**
- `GET /api/v1/chat/sessions` → `{sessions: [{id, title, created_at}]}`

**Profile:**
- `GET /api/v1/user/profile` → профиль юзера
- `PATCH /api/v1/user/profile` → обновить поля

**Тестовый аккаунт:** `test@mail.com` / `123`

Полный контракт: `docs/api.yaml`

---

## Phase 1 (доделать если не закончено)

- [ ] Подключить чат к backend API (если ещё нет)

---

## Phase 2 — Полный редизайн

Начни с миграции стека (не зависит от backend). Auth-интеграция — когда Даурен сделает эндпоинты.

### 2.1 — Миграция стека (день 1, без зависимости от backend)
- [ ] Установить Tailwind CSS v3:
  ```bash
  npm install -D tailwindcss postcss autoprefixer
  npx tailwindcss init -p
  ```
- [ ] Установить shadcn/ui:
  ```bash
  npx shadcn-ui@latest init
  ```
- [ ] Установить пакеты:
  ```bash
  npm install react-router-dom @tanstack/react-query framer-motion lucide-react
  ```
- [ ] TypeScript: переименовать `.jsx` → `.tsx`, добавить `tsconfig.json`
- [ ] **Удалить** старые файлы:
  - `src/mocks/scenarios.js`
  - `src/components/ChatMock.jsx`
  - `src/components/ProfileMock.jsx`
  - `src/components/ObligationsMock.jsx`
  - `src/pages/DemoPage.jsx`

### 2.2 — Роутинг
- [ ] `src/main.tsx` — BrowserRouter wrapping App
- [ ] `src/App.tsx` — Routes:
  - `/` — LandingPage (если не залогинен) или redirect `/chat`
  - `/login` — LoginPage
  - `/register` — RegisterPage
  - `/chat` — ChatPage (protected)
  - `/chat/:chatId` — конкретный чат
  - `/settings` — SettingsPage
- [ ] `src/lib/auth.ts` — хранение токенов (localStorage):
  - `getToken()`, `setTokens()`, `clearTokens()`, `isAuthenticated()`
- [ ] `src/components/ProtectedRoute.tsx` — redirect в `/login` если нет токена

### 2.3 — API клиент
- [ ] `src/api/client.ts` — базовый fetch:
  - Читает `VITE_API_URL` из env
  - Прикрепляет `Authorization: Bearer <token>` ко всем запросам
  - При 401 → redirect на login
- [ ] `src/api/auth.ts` — `register()`, `login()`, `refresh()`, `getMe()`
- [ ] `src/api/chat.ts` — `listSessions()`, `createSession()`, `getSession(id)`, `sendMessage(sessionId, text)`
- [ ] `src/api/profile.ts` — `getProfile()`, `updateProfile(fields)`

### 2.4 — Landing page (`/`)
- [ ] Split layout:
  - **Левая сторона:** название "Salyq AI", короткое описание (1-2 предложения), 3 фичи буллетами
  - **Правая сторона:** форма входа (email + пароль + кнопка "Войти")
  - Ссылка "Нет аккаунта? Зарегистрироваться" → `/register`
- [ ] Минималистичный стиль: белый фон, много пустого пространства
- [ ] Если уже залогинен → redirect `/chat`

### 2.5 — Login page (`/login`)
- [ ] Поля: email, пароль
- [ ] Кнопка "Войти"
- [ ] Ссылка на `/register`
- [ ] При успехе: сохранить токены, redirect `/chat`
- [ ] Ошибка: "Неверный email или пароль" (401)

### 2.6 — Register page (`/register`)
- [ ] **Шаг 1:** email + пароль + ФИО (обязательные) + кнопка "Далее"
- [ ] **Шаг 2:** форма профиля (ВСЕ поля скипаемые):
  - Тип: dropdown (ИП / Физлицо / ТОО)
  - Налоговый режим: text input
  - Годовой доход: number input
  - Вид деятельности: text input
  - Есть ли арендный доход: checkbox
  - Есть ли доход из-за рубежа: checkbox
- [ ] Кнопка "Пропустить" на Шаге 2 → завершить без заполнения
- [ ] Кнопка "Готово" → отправить profile + redirect `/chat`
- [ ] Плавная анимация между шагами (framer-motion)

### 2.7 — Chat page (`/chat`, `/chat/:chatId`) — ГЛАВНАЯ
- [ ] **Sidebar (слева, ~280px):**
  - Кнопка "Новый чат" сверху → `createSession()`, navigate `/chat/:newId`
  - Список чатов: каждый показывает `title` (или "Новый чат"), кликабельный
  - Активный чат подсвечен
  - Внизу: иконка настроек → `/settings`
  - Внизу: email юзера / аватарка
  - На мобилке: sidebar скрыт, открывается по hamburger-кнопке
- [ ] **Основная область (центр):**
  - Список сообщений с прокруткой
  - User messages — справа, assistant — слева
  - **Obligations inline** в ответах бота (collapsible секция внутри сообщения)
  - **Citations inline** в ответах бота (номер статьи + snippet, collapsible)
  - Input bar внизу + кнопка отправки
  - Typing indicator (анимированные точки) при ожидании
  - Авто-прокрутка вниз при новом сообщении

### 2.8 — Settings page (`/settings`)
- [ ] Отображение и редактирование всех полей профиля
- [ ] Кнопка "Сохранить" → `PATCH /api/v1/user/profile`
- [ ] Кнопка "Выйти" → очистить токены, redirect `/`
- [ ] Стрелка "Назад" → вернуться в чат

### 2.9 — Стиль и анимации
- [ ] Цвета: белый/серый база + один акцент (blue-600 или indigo-500)
- [ ] Стиль: Vercel/Linear вдохновение — много padding, 1px borders, subtle shadows
- [ ] shadcn/ui компоненты: Button, Input, Card, Dialog, Skeleton, Avatar, ScrollArea, Sheet
- [ ] framer-motion: page transitions, появление сообщений, sidebar open/close
- [ ] Loading: Skeleton loaders для списка чатов, spinner при отправке
- [ ] Responsive: sidebar → Sheet на < 768px
- [ ] Favicon: простая "S" иконка или весы
- [ ] `<title>Salyq AI — Налоговый консультант</title>`
