"""Reindex tax code articles in ChromaDB using OpenAI text-embedding-3-small."""

import json
import os
import shutil
from pathlib import Path

import chromadb
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / "backend" / "api_orchestrator" / ".env", override=False)

REPO_ROOT = Path(__file__).parent
ARTICLES_PATH = REPO_ROOT / "rk_tax_code_2026_articles.json"
CHROMA_PATH = REPO_ROOT / "chroma"
CHROMA_SEED_PATH = REPO_ROOT / "backend" / "chroma_seed"
COLLECTION_NAME = "rk_tax_code_2026_openai"
EMBEDDING_MODEL = "text-embedding-3-small"
BATCH_SIZE = 100


MAX_CHARS = 15000  # ~4000 tokens, safe for 8192 limit


def build_document(article: dict) -> str:
    parts = [
        f"Раздел {article['section_number']}. {article['section_title']}" if article.get("section_number") else "",
        f"Глава {article['chapter_number']}. {article['chapter_title']}" if article.get("chapter_number") else "",
        f"Статья {article['article_number']}. {article['article_title']}",
        article.get("text", ""),
    ]
    doc = "\n".join(p for p in parts if p)
    if len(doc) > MAX_CHARS:
        doc = doc[:MAX_CHARS]
    return doc


def embed_batch(client: OpenAI, texts: list[str]) -> list[list[float]]:
    response = client.embeddings.create(model=EMBEDDING_MODEL, input=texts)
    return [item.embedding for item in response.data]


def main():
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    print(f"Loading articles from {ARTICLES_PATH}...")
    raw = json.loads(ARTICLES_PATH.read_text(encoding="utf-8"))
    articles = raw if isinstance(raw, list) else raw.get("articles", raw.get("data", []))
    print(f"Found {len(articles)} articles")

    openai_client = OpenAI(api_key=api_key)

    documents = [build_document(a) for a in articles]
    ids = [f"article-{a['article_number']}" for a in articles]
    metadatas = [
        {
            "article_number": a["article_number"],
            "article_title": a["article_title"],
            "section_number": a.get("section_number") or "",
            "section_title": a.get("section_title") or "",
            "chapter_number": a.get("chapter_number") or "",
            "chapter_title": a.get("chapter_title") or "",
        }
        for a in articles
    ]
    raw_documents = [
        f"Статья {a['article_number']}. {a['article_title']}\n{a.get('text', '')}"
        for a in articles
    ]

    print(f"Embedding {len(documents)} documents with {EMBEDDING_MODEL}...")
    all_embeddings = []
    for start in range(0, len(documents), BATCH_SIZE):
        end = min(start + BATCH_SIZE, len(documents))
        batch = documents[start:end]
        embeddings = embed_batch(openai_client, batch)
        all_embeddings.extend(embeddings)
        print(f"  Embedded {end}/{len(documents)}")

    # Create new chroma directory (keep old as backup)
    new_chroma = REPO_ROOT / "chroma_openai"
    if new_chroma.exists():
        shutil.rmtree(new_chroma)
    new_chroma.mkdir(parents=True, exist_ok=True)
    CHROMA_PATH_ACTUAL = new_chroma

    print(f"Creating ChromaDB collection '{COLLECTION_NAME}' at {CHROMA_PATH_ACTUAL}...")
    client = chromadb.PersistentClient(path=str(CHROMA_PATH_ACTUAL))

    collection = client.get_or_create_collection(
        name=COLLECTION_NAME,
        metadata={
            "embedding_model": EMBEDDING_MODEL,
            "source": "rk_tax_code_2026_articles.json",
        },
    )

    for start in range(0, len(articles), BATCH_SIZE):
        end = min(start + BATCH_SIZE, len(articles))
        collection.upsert(
            ids=ids[start:end],
            embeddings=all_embeddings[start:end],
            metadatas=metadatas[start:end],
            documents=raw_documents[start:end],
        )
        print(f"  Uploaded {end}/{len(articles)}")

    # Copy to chroma_seed and chroma
    if CHROMA_SEED_PATH.exists():
        shutil.rmtree(CHROMA_SEED_PATH)
    shutil.copytree(CHROMA_PATH_ACTUAL, CHROMA_SEED_PATH)

    # Replace main chroma dir
    try:
        if CHROMA_PATH.exists():
            shutil.rmtree(CHROMA_PATH)
        shutil.copytree(CHROMA_PATH_ACTUAL, CHROMA_PATH)
    except PermissionError:
        print(f"Warning: Could not replace {CHROMA_PATH}, copy manually from {CHROMA_PATH_ACTUAL}")
    print(f"Copied to {CHROMA_SEED_PATH}")

    print("Done!")


if __name__ == "__main__":
    main()
