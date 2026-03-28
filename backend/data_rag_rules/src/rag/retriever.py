from __future__ import annotations

import os
from functools import lru_cache
from pathlib import Path
from typing import Any

import chromadb
from chromadb.api.models.Collection import Collection
from sentence_transformers import SentenceTransformer

REPO_ROOT = Path(__file__).resolve().parents[4]
SERVICE_ROOT = Path(__file__).resolve().parents[2]
DEFAULT_CHROMA_PATH = REPO_ROOT / "chroma"
CHROMA_PATH = os.getenv("CHROMA_PATH", "")
COLLECTION_NAME = os.getenv("CHROMA_COLLECTION_NAME", "rk_tax_code_2026_articles_e5_large")
MODEL_NAME = os.getenv("EMBEDDING_MODEL_NAME", "intfloat/multilingual-e5-large")
SNIPPET_LENGTH = 300


def _resolve_chroma_path() -> Path:
    if not CHROMA_PATH:
        return DEFAULT_CHROMA_PATH

    configured_path = Path(CHROMA_PATH)
    if configured_path.is_absolute():
        return configured_path

    return (SERVICE_ROOT / configured_path).resolve()


@lru_cache(maxsize=1)
def _get_embedding_model() -> SentenceTransformer:
    return SentenceTransformer(MODEL_NAME)


@lru_cache(maxsize=1)
def _get_collection() -> Collection:
    chroma_path = _resolve_chroma_path()
    client = chromadb.PersistentClient(path=str(chroma_path))

    try:
        return client.get_collection(COLLECTION_NAME)
    except Exception as exc:
        raise RuntimeError(
            f"Chroma collection '{COLLECTION_NAME}' was not found at '{chroma_path}'."
        ) from exc


def _make_snippet(document: str | None) -> str:
    if not document:
        return ""

    compact = " ".join(document.split())
    if len(compact) <= SNIPPET_LENGTH:
        return compact

    return compact[:SNIPPET_LENGTH].rstrip() + "..."


def _extract_item(payload: list[list[Any]] | None, index: int, default: Any = None) -> Any:
    if not payload or not payload[0]:
        return default

    try:
        return payload[0][index]
    except IndexError:
        return default


def retrieve(query: str, top_k: int = 5) -> list[dict]:
    """Find the most relevant RK Tax Code articles for a user query."""
    cleaned_query = query.strip()
    if not cleaned_query:
        return []

    if top_k <= 0:
        raise ValueError("top_k must be greater than 0.")

    collection = _get_collection()
    model = _get_embedding_model()
    query_embedding = model.encode(
        [f"query: {cleaned_query}"],
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    results = collection.query(
        query_embeddings=query_embedding.tolist(),
        n_results=top_k,
        include=["documents", "metadatas", "distances"],
    )

    ids = results.get("ids") or [[]]
    documents = results.get("documents")
    metadatas = results.get("metadatas")
    distances = results.get("distances")

    if not ids[0]:
        return []

    articles: list[dict] = []
    for index in range(len(ids[0])):
        metadata = _extract_item(metadatas, index, default={}) or {}
        document = _extract_item(documents, index, default="")
        score = _extract_item(distances, index)

        articles.append(
            {
                "article_number": metadata.get("article_number"),
                "article_title": metadata.get("article_title"),
                "snippet": _make_snippet(document),
                "score": score,
            }
        )

    return articles
