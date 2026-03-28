"""Salyq AI — MVP Backend entry point."""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

import sys
from pathlib import Path

# Add src/ and data_rag_rules/src/ to path
_src_dir = Path(__file__).resolve().parent
sys.path.insert(0, str(_src_dir))
sys.path.insert(0, str(_src_dir.parents[1] / "data_rag_rules" / "src"))

from db.database import init_db
from routes.chat import router as chat_router

app = FastAPI(title="Salyq AI API", version="0.2.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://localhost:5173"],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(chat_router)


@app.get("/api/v1/health")
def health():
    return {"status": "ok", "version": "0.2.0"}


@app.on_event("startup")
def on_startup():
    init_db()
    print("DB initialized at startup")
