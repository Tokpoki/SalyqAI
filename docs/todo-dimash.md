# TODO — Димаш (Frontend)

Твоя зона: `frontend/`

---

## Фаза 1 — Подключить реальный backend (ПРИОРИТЕТ)

Не начинай с "модернизации стека" — сначала подключи живой API. Модернизацию можно делать параллельно или после.

- [ ] Создать `.env` из `.env.example` (переменная `VITE_API_URL=http://localhost:8000`)
- [ ] Создать `src/api/client.js` — обёртка над fetch:
  ```javascript
  const API = import.meta.env.VITE_API_URL;
  export const createSession = () => fetch(`${API}/api/v1/chat/sessions`, {method: 'POST'}).then(r => r.json());
  export const sendMessage = (sessionId, text) => fetch(`${API}/api/v1/chat/sessions/${sessionId}/messages`, {method: 'POST', headers: {'Content-Type': 'application/json'}, body: JSON.stringify({text})}).then(r => r.json());
  export const getSession = (sessionId) => fetch(`${API}/api/v1/chat/sessions/${sessionId}`).then(r => r.json());
  ```
- [ ] При открытии страницы: вызвать `createSession()`, сохранить `sessionId` в state
- [ ] При нажатии "Отправить": вызвать `sendMessage()`, показать ответ
- [ ] **Несовпадение данных мок vs API:**
  - Мок obligations: `{name, deadline, status}` → API: `{code, title, due_date_rule, amount_kzt, basis}`
  - Мок citations: `{article, text}` → API: `{article_number, article_title, snippet}`
  - Мок messages: `msg.text` → API: `msg.content`
  - Нужно обновить компоненты `ObligationsMock` и `ChatMock` под реальный формат, или создать новые компоненты
- [ ] Показать `answer_text` в чате
- [ ] Показать `obligations` в правой панели
- [ ] Показать `citations` в блоке цитат
- [ ] Показать `action_plan` как список шагов
- [ ] Показать `confidence` (индикатор уверенности ответа)
- [ ] Loading-состояние при ожидании ответа

## Фаза 2 — Модернизация стека

- [ ] TypeScript (`.jsx` → `.tsx`) — ловит баги на этапе компиляции
- [ ] Tailwind CSS — заменить все inline `style={{}}` на классы
- [ ] shadcn/ui — готовые компоненты (кнопки, карточки, input, skeleton для loading)
- [ ] TanStack Query — кеширование API, loading/error states из коробки

## Фаза 3 — Новые фичи UI

- [ ] Кнопки лайк/дизлайк на ответах → `POST /api/v1/feedback`
- [ ] Форма профиля налогоплательщика → `PATCH /api/v1/chat/sessions/{id}/profile`
- [ ] Адаптивный дизайн (мобилки)
- [ ] Анимация появления сообщений
- [ ] "Печатает..." индикатор при ожидании

## Фаза 4 — Полировка

- [ ] Favicon и мета-теги
- [ ] Иконки (Lucide React)
- [ ] React Router (когда появятся доп. страницы)
