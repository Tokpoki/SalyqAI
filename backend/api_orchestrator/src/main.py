"""Salyq AI — MVP Backend entry point."""

import sys
import logging
from pathlib import Path

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from src.config import get_settings

_src_dir = Path(__file__).resolve().parent

# Add src/ and data_rag_rules/src/ to path
sys.path.insert(0, str(_src_dir))
sys.path.insert(0, str(_src_dir.parents[1] / "data_rag_rules" / "src"))

from db import database as db_module
from routes.auth import router as auth_router
from routes.chat import router as chat_router
from routes.feedback import router as feedback_router
from routes.internal import router as internal_router
from routes.knowledge import router as knowledge_router
from routes.profile import router as profile_router

logging.basicConfig(level=logging.INFO)

app = FastAPI(title="Salyq AI API", version="0.3.0")
settings = get_settings()

db_module.DB_PATH = settings.db_path

app.add_middleware(
    CORSMiddleware,
    allow_origins=settings.cors_origins,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(auth_router)
app.include_router(chat_router)
app.include_router(profile_router)
app.include_router(feedback_router)
app.include_router(knowledge_router)
app.include_router(internal_router)


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "version": "0.3.0"}


@app.on_event("startup")
def on_startup():
    init_db = db_module.init_db
    init_db()
    if not settings.chroma_path.exists():
        print(f"WARNING: CHROMA_PATH does not exist: {settings.chroma_path}")
    print("DB initialized at startup")
