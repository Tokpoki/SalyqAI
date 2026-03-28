# Туториал для Димаша — Frontend

Привет! Этот файл объясняет простыми словами, что ты делаешь, зачем, и как работать.

---

## Что ты делаешь?

Ты делаешь **фронтенд** — это то, что видит пользователь в браузере. Красивый чат, панель с профилем, карточки налоговых обязательств.

Сейчас всё работает на моковых (фейковых) данных. Твоя задача — постепенно подключить реальный backend API.

## Твоя папка

```
frontend/
├── app/
│   ├── src/
│   │   ├── pages/
│   │   │   └── DemoPage.jsx      ← главная страница
│   │   ├── components/
│   │   │   ├── ChatMock.jsx       ← компонент чата
│   │   │   ├── ProfileMock.jsx    ← профиль налогоплательщика
│   │   │   └── ObligationsMock.jsx ← обязательства + цитаты
│   │   ├── mocks/
│   │   │   └── scenarios.js       ← фейковые данные (3 сценария)
│   │   └── main.jsx               ← точка входа
│   ├── package.json
│   └── vite.config.js
└── README.md
```

## Как запустить

```bash
cd frontend/app
npm install
npm run dev
```

Открой http://localhost:3000 в браузере.

## Как работает код

1. `main.jsx` — запускает React-приложение
2. `DemoPage.jsx` — главная страница с тремя колонками:
   - Левая: профиль налогоплательщика
   - Центр: чат
   - Правая: обязательства и цитаты
3. `scenarios.js` — три набора фейковых данных (ИП, аренда, программист)
4. Переключатель сценариев в шапке — меняет данные на странице

## Стек который нужно освоить

Сейчас стек минимальный. Для продакшна нужно перейти на:

| Инструмент | Зачем |
|---|---|
| **TypeScript** | Ловит ошибки до запуска. Вместо `.jsx` будешь писать `.tsx` |
| **Tailwind CSS** | Стили через классы (`className="bg-blue-500 p-4 rounded"`) вместо inline `style={{}}` |
| **shadcn/ui** | Готовые красивые компоненты — кнопки, карточки, модалки |
| **TanStack Query** | Удобная работа с API — загрузка данных, кеширование, loading-состояния |
| **React Router** | Навигация между страницами |

Не обязательно всё сразу. Начни с Tailwind + TypeScript.

## Как подключить реальный API

Backend работает на http://localhost:8000. Пример:

```javascript
// Создать сессию
const res = await fetch('http://localhost:8000/api/v1/chat/sessions', {
  method: 'POST'
});
const session = await res.json();
// session.id — это UUID сессии

// Отправить сообщение
const res2 = await fetch(`http://localhost:8000/api/v1/chat/sessions/${session.id}/messages`, {
  method: 'POST',
  headers: { 'Content-Type': 'application/json' },
  body: JSON.stringify({ text: 'Какие налоги платит ИП?' })
});
const answer = await res2.json();
// answer.answer_text — текст ответа
// answer.obligations — список обязательств
// answer.citations — ссылки на статьи
```

## Как работать с Git

### Перед началом работы
```bash
git checkout main
git pull
git checkout -b dimash/task-name
```

### После завершения работы
```bash
git add frontend/
git commit -m "feat: connect chat to real API"
git push -u origin dimash/task-name
```

Затем создай Pull Request на GitHub (main ← dimash/task-name).

### Правила
- **Никогда** не пуш напрямую в `main`
- Всегда работай в ветке `dimash/что-делаешь`
- Перед пушем проверь что `npm run dev` работает без ошибок

### Формат коммитов
```
feat: подключил чат к реальному API
fix: исправил отображение цитат
style: перевёл стили на Tailwind
```

## Чего НЕ делать

- Не трогай `backend/` — это зона Даурена и Магжана
- Не меняй `docs/api.yaml` без обсуждения
- Не добавляй свои API эндпоинты

## Контракт с бэкендом

Все форматы запросов и ответов описаны в `docs/api.yaml`. Если бэкенд возвращает не то, что там написано — это баг бэкенда, скажи Даурену.

## Если застрял

1. Открой http://localhost:8000/docs — там Swagger UI, можно потыкать API руками
2. Посмотри `docs/api.yaml` — формат ответов
3. Спроси тимлида
