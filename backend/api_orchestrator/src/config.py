"""Centralized runtime configuration for API Orchestrator."""

from __future__ import annotations

import os
from dataclasses import dataclass
from pathlib import Path

from dotenv import load_dotenv

_SRC_DIR = Path(__file__).resolve().parent
_BACKEND_DIR = _SRC_DIR.parent

# Ensure .env values are available even when app is imported outside uvicorn startup.
load_dotenv(_BACKEND_DIR / ".env", override=False)


def _resolve_path(raw_path: str, base_dir: Path) -> Path:
    candidate = Path(raw_path)
    if not candidate.is_absolute():
        candidate = (base_dir / candidate).resolve()
    return candidate


@dataclass(frozen=True)
class Settings:
    gemini_api_key: str
    gemini_model: str
    openai_api_key: str
    openai_model: str
    llm_provider: str  # "openai" or "gemini"
    jwt_secret: str
    jwt_access_expire_minutes: int
    jwt_refresh_expire_days: int
    db_path: Path
    chroma_path: Path
    chroma_collection: str
    knowledge_version: str
    cors_origins: list[str]


def get_settings() -> Settings:
    db_path_raw = os.getenv("DB_PATH", "../salyq_dev.db")
    chroma_path_raw = os.getenv("CHROMA_PATH", "../../chroma")
    cors_raw = os.getenv("CORS_ORIGINS", "http://localhost:3000,http://localhost:5173")

    return Settings(
        gemini_api_key=os.getenv("GEMINI_API_KEY", "").strip(),
        gemini_model=os.getenv("GEMINI_MODEL", "gemini-2.0-flash").strip(),
        openai_api_key=os.getenv("OPENAI_API_KEY", "").strip(),
        openai_model=os.getenv("OPENAI_MODEL", "gpt-4o-mini").strip(),
        llm_provider=os.getenv("LLM_PROVIDER", "openai").strip(),
        jwt_secret=os.getenv("JWT_SECRET", "").strip(),
        jwt_access_expire_minutes=int(os.getenv("JWT_ACCESS_EXPIRE_MINUTES", "30")),
        jwt_refresh_expire_days=int(os.getenv("JWT_REFRESH_EXPIRE_DAYS", "7")),
        db_path=_resolve_path(db_path_raw, _BACKEND_DIR),
        chroma_path=_resolve_path(chroma_path_raw, _BACKEND_DIR),
        chroma_collection=os.getenv("CHROMA_COLLECTION", "rk_tax_code_2026_openai").strip(),
        knowledge_version=os.getenv("KNOWLEDGE_VERSION", "tax_code_2026_v1").strip(),
        cors_origins=[origin.strip() for origin in cors_raw.split(",") if origin.strip()],
    )
