from __future__ import annotations

import argparse
import json
import re
from dataclasses import dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable

import chromadb
import fitz
from sentence_transformers import SentenceTransformer
from tqdm import tqdm


SECTION_RE = re.compile(r"^(?:РАЗДЕЛ|Раздел)\s+(\d+(?:-\d+)?)\.\s*(.*)$")
CHAPTER_RE = re.compile(r"^Глава\s+(\d+(?:-\d+)?)\.\s*(.*)$")
ARTICLE_RE = re.compile(r"^Статья\s+(\d+(?:-\d+)?)\.\s*(.*)$")
PARAGRAPH_RE = re.compile(r"^Параграф\s+(\d+(?:-\d+)?)\.\s*(.*)$")
LIST_ITEM_RE = re.compile(r"^(?:\d+[\.\)]|[а-яёa-zivxlcdm]+[\.\)])\s*", re.IGNORECASE)


@dataclass
class Line:
    page: int
    raw: str
    stripped: str
    indent: int


def iter_pdf_lines(pdf_path: Path) -> Iterable[Line]:
    doc = fitz.open(pdf_path)
    try:
        for page_index in range(doc.page_count):
            page = doc.load_page(page_index)
            for raw in page.get_text("text").splitlines():
                stripped = raw.strip()
                indent = len(raw) - len(raw.lstrip(" "))
                yield Line(
                    page=page_index + 1,
                    raw=raw.rstrip(),
                    stripped=stripped,
                    indent=indent,
                )
    finally:
        doc.close()


def normalize_title_lines(lines: list[str]) -> str:
    text = " ".join(line.strip() for line in lines if line.strip())
    return re.sub(r"\s+", " ", text).strip()


def normalize_article_text(lines: list[Line]) -> str:
    paragraphs: list[str] = []
    current = ""

    for line in lines:
        text = line.stripped
        if not text:
            if current:
                paragraphs.append(current.strip())
                current = ""
            continue

        if text == ".":
            continue

        if current:
            new_paragraph = LIST_ITEM_RE.match(text) or (
                line.indent > 0 and current.endswith((".", ";", ":"))
            )
            if new_paragraph:
                paragraphs.append(current.strip())
                current = text
            elif current.endswith("-"):
                current = current[:-1] + text
            else:
                current = f"{current} {text}"
        else:
            current = text

    if current:
        paragraphs.append(current.strip())

    cleaned = [re.sub(r"\s+", " ", paragraph).strip() for paragraph in paragraphs]
    return "\n".join(paragraph for paragraph in cleaned if paragraph)


def consume_heading_continuation(lines: list[Line], start_index: int, initial_value: str) -> tuple[str, int]:
    title_lines = [initial_value.strip()] if initial_value.strip() else []
    j = start_index + 1

    while j < len(lines):
        candidate = lines[j]
        candidate_text = candidate.stripped

        if not candidate_text:
            break
        if (
            SECTION_RE.match(candidate_text)
            or CHAPTER_RE.match(candidate_text)
            or ARTICLE_RE.match(candidate_text)
            or PARAGRAPH_RE.match(candidate_text)
        ):
            break
        if candidate.indent > 0:
            break

        title_lines.append(candidate_text)
        j += 1

    return normalize_title_lines(title_lines), j


def parse_articles(pdf_path: Path) -> list[dict]:
    section_number = None
    section_title = None
    chapter_number = None
    chapter_title = None
    current_article: dict | None = None
    current_body_lines: list[Line] = []

    lines = list(iter_pdf_lines(pdf_path))
    i = 0

    def finalize_current_article() -> None:
        nonlocal current_article, current_body_lines
        if not current_article:
            return

        current_article["text"] = normalize_article_text(current_body_lines)
        if not current_article.get("source", {}).get("page_end"):
            current_article["source"]["page_end"] = current_article["source"]["page_start"]
        articles.append(current_article)
        current_article = None
        current_body_lines = []

    articles: list[dict] = []

    while i < len(lines):
        line = lines[i]
        text = line.stripped

        if not text:
            if current_article:
                current_body_lines.append(line)
            i += 1
            continue

        section_match = SECTION_RE.match(text)
        if section_match:
            finalize_current_article()
            section_number = section_match.group(1)
            section_title, i = consume_heading_continuation(lines, i, section_match.group(2))
            continue

        chapter_match = CHAPTER_RE.match(text)
        if chapter_match:
            finalize_current_article()
            chapter_number = chapter_match.group(1)
            chapter_title, i = consume_heading_continuation(lines, i, chapter_match.group(2))
            continue

        if PARAGRAPH_RE.match(text):
            if current_article:
                current_body_lines.append(Line(page=line.page, raw="", stripped="", indent=0))
            i += 1
            continue

        article_match = ARTICLE_RE.match(text)
        if article_match:
            finalize_current_article()
            article_number = article_match.group(1).strip()
            start_page = line.page
            article_title, i = consume_heading_continuation(lines, i, article_match.group(2))
            current_article = {
                "article_number": article_number,
                "article_title": article_title,
                "section_number": section_number,
                "section_title": section_title,
                "chapter_number": chapter_number,
                "chapter_title": chapter_title,
                "text": "",
                "source": {
                    "file": str(pdf_path.resolve()),
                    "law_number": "214-VIII ЗРК",
                    "law_date": "2025-07-18",
                    "page_start": start_page,
                    "page_end": start_page,
                },
            }
            continue

        if current_article:
            current_body_lines.append(line)
            current_article["source"]["page_end"] = line.page

        i += 1

    finalize_current_article()
    return articles


def build_document_for_embedding(article: dict) -> str:
    parts = [
        f"Раздел {article['section_number']}. {article['section_title']}" if article["section_number"] else "",
        f"Глава {article['chapter_number']}. {article['chapter_title']}" if article["chapter_number"] else "",
        f"Статья {article['article_number']}. {article['article_title']}",
        article["text"],
    ]
    payload = "\n".join(part for part in parts if part)
    return f"passage: {payload}"


def persist_json(articles: list[dict], pdf_path: Path, output_path: Path) -> None:
    payload = {
        "document": {
            "title": "Налоговый кодекс Республики Казахстан",
            "law_number": "214-VIII ЗРК",
            "law_date": "2025-07-18",
            "source_file": str(pdf_path.resolve()),
            "generated_at_utc": datetime.now(timezone.utc).isoformat(),
            "article_count": len(articles),
        },
        "articles": articles,
    }
    output_path.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2),
        encoding="utf-8",
    )


def persist_chroma(
    articles: list[dict],
    chroma_path: Path,
    collection_name: str,
    model_name: str,
    batch_size: int,
) -> None:
    model = SentenceTransformer(model_name)
    documents = [build_document_for_embedding(article) for article in articles]
    embeddings = model.encode(
        documents,
        batch_size=batch_size,
        show_progress_bar=True,
        normalize_embeddings=True,
        convert_to_numpy=True,
    )

    client = chromadb.PersistentClient(path=str(chroma_path.resolve()))
    collection = client.get_or_create_collection(
        name=collection_name,
        metadata={
            "embedding_model": model_name,
            "source": "k2500000214.18-07-2025.rus.pdf",
            "law_number": "214-VIII ЗРК",
        },
    )

    ids = [f"article-{article['article_number']}" for article in articles]
    metadatas = [
        {
            "article_number": article["article_number"],
            "article_title": article["article_title"],
            "section_number": article["section_number"] or "",
            "section_title": article["section_title"] or "",
            "chapter_number": article["chapter_number"] or "",
            "chapter_title": article["chapter_title"] or "",
            "source_file": article["source"]["file"],
            "page_start": article["source"]["page_start"],
            "page_end": article["source"]["page_end"],
        }
        for article in articles
    ]
    raw_documents = [
        "\n".join(
            part
            for part in [
                f"Статья {article['article_number']}. {article['article_title']}",
                article["text"],
            ]
            if part
        )
        for article in articles
    ]

    for start in tqdm(range(0, len(articles), batch_size), desc="Uploading to Chroma"):
        end = start + batch_size
        collection.upsert(
            ids=ids[start:end],
            embeddings=embeddings[start:end].tolist(),
            metadatas=metadatas[start:end],
            documents=raw_documents[start:end],
        )


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Parse the Kazakhstan Tax Code PDF into article JSON and ChromaDB embeddings."
    )
    parser.add_argument(
        "--pdf",
        type=Path,
        default=Path("k2500000214.18-07-2025.rus.pdf"),
        help="Path to the source PDF.",
    )
    parser.add_argument(
        "--json-out",
        type=Path,
        default=Path("rk_tax_code_2026_articles.json"),
        help="Path to the output JSON file.",
    )
    parser.add_argument(
        "--chroma-dir",
        type=Path,
        default=Path("./chroma"),
        help="Directory for the local ChromaDB database.",
    )
    parser.add_argument(
        "--collection",
        default="rk_tax_code_2026_articles_e5_large",
        help="ChromaDB collection name.",
    )
    parser.add_argument(
        "--model",
        default="intfloat/multilingual-e5-large",
        help="SentenceTransformer model name.",
    )
    parser.add_argument(
        "--batch-size",
        type=int,
        default=8,
        help="Batch size for embedding generation and Chroma upserts.",
    )
    return parser.parse_args()


def main() -> None:
    args = parse_args()
    pdf_path = args.pdf.resolve()
    if not pdf_path.exists():
        raise FileNotFoundError(f"PDF not found: {pdf_path}")

    articles = parse_articles(pdf_path)
    if not articles:
        raise RuntimeError("No articles were parsed from the PDF.")

    persist_json(articles, pdf_path, args.json_out.resolve())
    persist_chroma(
        articles=articles,
        chroma_path=args.chroma_dir,
        collection_name=args.collection,
        model_name=args.model,
        batch_size=args.batch_size,
    )

    print(f"Parsed articles: {len(articles)}")
    print(f"JSON written to: {args.json_out.resolve()}")
    print(f"ChromaDB path: {args.chroma_dir}")
    print(f"Collection name: {args.collection}")
    print(f"First article: {articles[0]['article_number']} - {articles[0]['article_title']}")
    print(f"Last article: {articles[-1]['article_number']} - {articles[-1]['article_title']}")


if __name__ == "__main__":
    main()
