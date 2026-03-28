# Туториал для Магжана — Data / RAG / Rules

Привет! Этот файл объясняет простыми словами, что ты делаешь, зачем, и как работать.

---

## Что ты делаешь?

Ты отвечаешь за три вещи:

1. **RAG** — поиск релевантных статей НК РК по вопросу пользователя
2. **Rules** — детерминированные правила ("ИП на упрощёнке → форма 910")
3. **База данных** — хранение сессий, профилей, сообщений

## Что уже готово (важно!)

До начала проекта мы уже сделали главное:

- **844 статьи НК РК** уже загружены в Chroma vector DB
- Файл `chroma/` в корне проекта — это готовая база с embeddings
- Файл `rk_tax_code_2026_articles.json` — все статьи в JSON
- Скрипт `parse_tax_code_to_chroma.py` — парсер PDF (уже отработал)

**Тебе НЕ нужно заново парсить PDF или считать embeddings.** Нужно только написать обёртку для поиска.

## Твоя папка

```
backend/data_rag_rules/
├── src/
│   ├── db/
│   │   └── database.py   ← работа с базой данных (уже работает)
│   ├── rag/               ← СЮДА пиши retriever.py
│   └── rules/             ← СЮДА пиши engine.py
└── tests/                 ← тесты

Уже существуют в корне проекта:
├── chroma/                        ← готовая Chroma DB (не трогай!)
├── rk_tax_code_2026_articles.json ← 844 статьи
└── parse_tax_code_to_chroma.py    ← скрипт парсинга (уже отработал)
```

## Главная задача #1 — RAG retriever

Создай файл `src/rag/retriever.py`. Вот что он должен делать:

```python
import chromadb
from sentence_transformers import SentenceTransformer

# Путь к уже существующей Chroma
CHROMA_PATH = Path(__file__).resolve().parents[4] / "chroma"
COLLECTION_NAME = "rk_tax_code_2026_articles_e5_large"

# Загрузить ту же модель, которой считали embeddings
model = SentenceTransformer("intfloat/multilingual-e5-large")

def retrieve(query: str, top_k: int = 5) -> list[dict]:
    """Найти top_k самых релевантных статей НК РК по запросу."""
    client = chromadb.PersistentClient(path=str(CHROMA_PATH))
    collection = client.get_collection(COLLECTION_NAME)

    # Chroma сама найдёт ближайшие вектора
    results = collection.query(
        query_texts=[f"query: {query}"],
        n_results=top_k,
    )

    # Вернуть в нужном формате
    articles = []
    for i in range(len(results["ids"][0])):
        articles.append({
            "article_number": results["metadatas"][0][i].get("article_number"),
            "article_title": results["metadatas"][0][i].get("article_title"),
            "snippet": results["documents"][0][i][:300],
            "score": results["distances"][0][i] if results["distances"] else None,
        })
    return articles
```

**Проверь:** запусти Python и попробуй:
```python
from src.rag.retriever import retrieve
results = retrieve("Какие налоги платит ИП на упрощёнке?")
for r in results:
    print(r["article_number"], r["article_title"])
```

Должны найтись статьи про упрощённую декларацию (683, 686, 687 и т.п.).

## Главная задача #2 — Rules Engine

Создай файл `src/rules/engine.py`. Это простые if/else:

```python
def evaluate(profile: dict) -> list[dict]:
    """На основе профиля определить налоговые обязательства."""
    obligations = []

    if profile.get("taxpayer_type") == "sole_proprietor":
        if profile.get("tax_regime") == "simplified":
            obligations.append({
                "code": "FORM_910_00",
                "title": "Декларация 910.00 (упрощённая)",
                "due_date_rule": "До 15 августа за 1-е полугодие",
                "basis": "ст. 686 НК РК"
            })
            # ... ОПВ, СО ...

    if profile.get("has_rental_income"):
        obligations.append({
            "code": "FORM_240_00",
            "title": "Декларация 240.00 (доходы физлица)",
            "due_date_rule": "До 31 марта следующего года",
            "basis": "ст. 316 НК РК"
        })

    return obligations
```

## Что такое RAG простыми словами

Представь библиотеку из 844 статей НК РК. Пользователь спрашивает вопрос. RAG — это "умный библиотекарь", который мгновенно находит 3-5 самых подходящих статей.

Как это работает:
1. Каждая статья уже превращена в числовой вектор (embedding) — **это уже сделано**
2. Вопрос пользователя тоже превращается в вектор
3. Chroma ищет ближайшие вектора — это и есть релевантные статьи

## Как работать с Git

### Перед началом работы
```bash
git checkout main
git pull
git checkout -b magzhan/task-name
```

### После завершения работы
```bash
git add backend/data_rag_rules/ migrations/
git commit -m "feat: add RAG retriever for tax code articles"
git push -u origin magzhan/task-name
```

Затем создай Pull Request на GitHub (main ← magzhan/task-name).

### Правила
- **Никогда** не пуш напрямую в `main`
- Всегда работай в ветке `magzhan/что-делаешь`
- **Не трогай `chroma/` и `rk_tax_code_2026_articles.json`** — это готовые данные
- Перед пушем проверь что сервер запускается

### Формат коммитов
```
feat: add RAG retriever using Chroma
feat: add rules engine for IP simplified
fix: fix foreign key in migration
test: add tests for retrieve function
```

## Чего НЕ делать

- Не трогай `backend/api_orchestrator/` — это зона Даурена
- Не трогай `frontend/` — это зона Димаша
- Не удаляй и не пересоздавай `chroma/` — это готовая база
- Не меняй `docs/api.yaml` без обсуждения

## Если застрял

1. Посмотри `docs/db-schema.sql` — целевая схема
2. Посмотри `docs/api.yaml` — форматы данных
3. Попробуй `retrieve()` руками в Python — посмотри что возвращает Chroma
4. Спроси тимлида
