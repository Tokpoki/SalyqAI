"""Reindex tax code + KoAP articles in ChromaDB using OpenAI text-embedding-3-small.

Reads all JSON sources and indexes them into a single collection.
Each source uses its own ID prefix to avoid collisions:
  - tax code:  article-{number}
  - КоАП:      koap-{number}
"""

import json
import os
import shutil
from pathlib import Path

import chromadb
from openai import OpenAI
from dotenv import load_dotenv

load_dotenv(Path(__file__).parent / "backend" / "api_orchestrator" / ".env", override=False)

REPO_ROOT = Path(__file__).parent

# ── Sources: (json_path, id_prefix, source_tag) ──
SOURCES = [
    (REPO_ROOT / "rk_tax_code_2026_articles.json", "article", "tax_code"),
    (REPO_ROOT / "rk_koap_articles.json",          "koap",    "koap"),
]

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


def load_articles(json_path: Path) -> list[dict]:
    """Load articles from a JSON file (supports both list and {articles:[...]} format)."""
    raw = json.loads(json_path.read_text(encoding="utf-8"))
    return raw if isinstance(raw, list) else raw.get("articles", raw.get("data", []))


def main():
    api_key = os.getenv("OPENAI_API_KEY", "").strip()
    if not api_key:
        raise RuntimeError("OPENAI_API_KEY not set")

    openai_client = OpenAI(api_key=api_key)

    # ── Collect articles from all sources ──
    all_documents = []
    all_ids = []
    all_metadatas = []
    all_raw_documents = []

    for json_path, id_prefix, source_tag in SOURCES:
        if not json_path.exists():
            print(f"Skipping {json_path.name} (not found)")
            continue

        print(f"Loading {json_path.name}...")
        articles = load_articles(json_path)
        print(f"  Found {len(articles)} articles (source={source_tag})")

        for a in articles:
            all_documents.append(build_document(a))
            all_ids.append(f"{id_prefix}-{a['article_number']}")
            all_metadatas.append({
                "article_number": a["article_number"],
                "article_title": a["article_title"],
                "section_number": a.get("section_number") or "",
                "section_title": a.get("section_title") or "",
                "chapter_number": a.get("chapter_number") or "",
                "chapter_title": a.get("chapter_title") or "",
                "source": source_tag,
            })
            all_raw_documents.append(
                f"Статья {a['article_number']}. {a['article_title']}\n{a.get('text', '')}"
            )

    if not all_documents:
        raise RuntimeError("No articles found in any source JSON.")

    print(f"\nTotal: {len(all_documents)} documents from {sum(1 for p, _, _ in SOURCES if p.exists())} source(s)")
    print(f"Embedding with {EMBEDDING_MODEL}...")

    all_embeddings = []
    for start in range(0, len(all_documents), BATCH_SIZE):
        end = min(start + BATCH_SIZE, len(all_documents))
        batch = all_documents[start:end]
        embeddings = embed_batch(openai_client, batch)
        all_embeddings.extend(embeddings)
        print(f"  Embedded {end}/{len(all_documents)}")

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
            "sources": ", ".join(p.name for p, _, _ in SOURCES if p.exists()),
        },
    )

    for start in range(0, len(all_documents), BATCH_SIZE):
        end = min(start + BATCH_SIZE, len(all_documents))
        collection.upsert(
            ids=all_ids[start:end],
            embeddings=all_embeddings[start:end],
            metadatas=all_metadatas[start:end],
            documents=all_raw_documents[start:end],
        )
        print(f"  Uploaded {end}/{len(all_documents)}")

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
