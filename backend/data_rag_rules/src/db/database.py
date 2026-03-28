"""
Minimal SQLite database layer for Salyq AI MVP.
Two tables: chat_sessions, chat_messages.
"""

import sqlite3
import os
from pathlib import Path

DB_PATH = Path(__file__).resolve().parents[3] / "salyq_dev.db"

_DDL = """
CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'active',
    created_at TEXT NOT NULL
);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES chat_sessions(id),
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    created_at TEXT NOT NULL
);
"""


def get_connection() -> sqlite3.Connection:
    conn = sqlite3.connect(str(DB_PATH))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def init_db():
    conn = get_connection()
    conn.executescript(_DDL)
    conn.close()


# ── Session operations ────────────────────────────────────────────

def create_session(session_id: str, created_at: str) -> dict:
    conn = get_connection()
    conn.execute(
        "INSERT INTO chat_sessions (id, status, created_at) VALUES (?, 'active', ?)",
        (session_id, created_at),
    )
    conn.commit()
    row = conn.execute("SELECT * FROM chat_sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    return dict(row)


def get_session(session_id: str) -> dict | None:
    conn = get_connection()
    row = conn.execute("SELECT * FROM chat_sessions WHERE id = ?", (session_id,)).fetchone()
    conn.close()
    return dict(row) if row else None


# ── Message operations ────────────────────────────────────────────

def insert_message(msg_id: str, session_id: str, role: str, content: str, created_at: str):
    conn = get_connection()
    conn.execute(
        "INSERT INTO chat_messages (id, session_id, role, content, created_at) VALUES (?, ?, ?, ?, ?)",
        (msg_id, session_id, role, content, created_at),
    )
    conn.commit()
    conn.close()


def get_messages(session_id: str) -> list[dict]:
    conn = get_connection()
    rows = conn.execute(
        "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at",
        (session_id,),
    ).fetchall()
    conn.close()
    return [dict(r) for r in rows]
