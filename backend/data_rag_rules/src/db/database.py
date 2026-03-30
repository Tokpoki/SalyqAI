"""SQLite database layer for Salyq AI data, RAG, and rules services."""

from __future__ import annotations

import json
import os
import sqlite3
import uuid
from datetime import datetime, timezone
from pathlib import Path
from typing import Any

import bcrypt

REPO_ROOT = Path(__file__).resolve().parents[4]
DEFAULT_DB_PATH = REPO_ROOT / "salyq_dev.db"
DEFAULT_MIGRATIONS_PATH = REPO_ROOT / "migrations"
DEFAULT_KNOWLEDGE_VERSION = "tax_code_2026_v1"
TEST_USER_ID = "00000000-0000-0000-0000-000000000001"
TEST_USER_EMAIL = "test@mail.com"
TEST_USER_NAME = "Test User"

PROFILE_FIELDS = (
    "taxpayer_type",
    "tax_regime",
    "annual_income_kzt",
    "employees_count",
    "activity_type",
    "has_foreign_income",
    "has_rental_income",
    "residency_status",
    "oked_code",
    "oked_name",
    "oked_banned",
    "language",
)

_DDL = """
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    email TEXT NOT NULL UNIQUE,
    password_hash TEXT NOT NULL,
    name TEXT NOT NULL,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_users_email
ON users(email);

CREATE TABLE IF NOT EXISTS chat_sessions (
    id TEXT PRIMARY KEY,
    status TEXT NOT NULL DEFAULT 'active',
    knowledge_version TEXT NOT NULL DEFAULT 'tax_code_2026_v1',
    user_id TEXT REFERENCES users(id),
    title TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_sessions_user
ON chat_sessions(user_id);

CREATE TABLE IF NOT EXISTS taxpayer_profiles (
    id TEXT PRIMARY KEY,
    session_id TEXT UNIQUE REFERENCES chat_sessions(id) ON DELETE CASCADE,
    user_id TEXT UNIQUE REFERENCES users(id) ON DELETE CASCADE,
    taxpayer_type TEXT,
    tax_regime TEXT,
    annual_income_kzt REAL,
    employees_count INTEGER,
    activity_type TEXT,
    has_foreign_income INTEGER,
    has_rental_income INTEGER,
    residency_status TEXT,
    oked_code TEXT,
    oked_name TEXT,
    oked_banned INTEGER DEFAULT 0,
    language TEXT DEFAULT 'ru',
    updated_at TEXT NOT NULL
);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user
ON taxpayer_profiles(user_id);

CREATE TABLE IF NOT EXISTS chat_messages (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    role TEXT NOT NULL,
    content TEXT NOT NULL,
    advice_json TEXT,
    confidence REAL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_chat_messages_session_id
ON chat_messages(session_id);

CREATE TABLE IF NOT EXISTS extracted_facts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES chat_sessions(id) ON DELETE CASCADE,
    message_id TEXT REFERENCES chat_messages(id) ON DELETE SET NULL,
    fact_key TEXT NOT NULL,
    fact_value TEXT,
    confidence REAL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_extracted_facts_session_id
ON extracted_facts(session_id);

CREATE INDEX IF NOT EXISTS idx_extracted_facts_message_id
ON extracted_facts(message_id);

CREATE TABLE IF NOT EXISTS answer_citations (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    article_number TEXT,
    article_title TEXT,
    snippet TEXT,
    score REAL,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_answer_citations_message_id
ON answer_citations(message_id);

CREATE TABLE IF NOT EXISTS feedback (
    id TEXT PRIMARY KEY,
    message_id TEXT NOT NULL REFERENCES chat_messages(id) ON DELETE CASCADE,
    rating TEXT NOT NULL,
    reason TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_feedback_message_id
ON feedback(message_id);

CREATE TABLE IF NOT EXISTS error_logs (
    id TEXT PRIMARY KEY,
    user_id TEXT REFERENCES users(id),
    session_id TEXT,
    error_type TEXT NOT NULL,
    error_message TEXT NOT NULL,
    stack_trace TEXT,
    created_at TEXT NOT NULL DEFAULT (datetime('now'))
);
"""


def _utc_now_iso() -> str:
    return datetime.now(timezone.utc).isoformat()


def _resolve_repo_relative_path(raw_path: str, default_path: Path) -> Path:
    configured_path = raw_path.strip()
    if not configured_path:
        return default_path

    path = Path(configured_path)
    if path.is_absolute():
        return path

    return (REPO_ROOT / path).resolve()


def get_db_path() -> Path:
    return _resolve_repo_relative_path(os.getenv("DB_PATH", ""), DEFAULT_DB_PATH)


def get_migrations_path() -> Path:
    return _resolve_repo_relative_path(
        os.getenv("MIGRATIONS_PATH", ""),
        DEFAULT_MIGRATIONS_PATH,
    )


def _row_to_dict(row: sqlite3.Row | None) -> dict[str, Any] | None:
    if row is None:
        return None

    payload = dict(row)
    if "advice_json" in payload:
        payload["advice_json"] = _decode_json_value(payload.get("advice_json"))

    for field in ("has_foreign_income", "has_rental_income"):
        if field in payload:
            payload[field] = _decode_bool(payload.get(field))

    return payload


def _decode_bool(value: Any) -> bool | None:
    if value is None:
        return None

    return bool(value)


def _encode_json_value(value: Any) -> str | None:
    if value is None:
        return None

    if isinstance(value, str):
        return value

    return json.dumps(value, ensure_ascii=False)


def _decode_json_value(value: Any) -> Any:
    if value is None or value == "":
        return None

    if not isinstance(value, str):
        return value

    try:
        return json.loads(value)
    except json.JSONDecodeError:
        return value


def _split_sql_statements(script: str) -> list[str]:
    return [statement.strip() for statement in script.split(";") if statement.strip()]


def _looks_like_timestamp(value: str | None) -> bool:
    if not value or "T" not in value:
        return False

    try:
        datetime.fromisoformat(value.replace("Z", "+00:00"))
    except ValueError:
        return False

    return True


def _table_exists(conn: sqlite3.Connection, table_name: str) -> bool:
    row = conn.execute(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
        (table_name,),
    ).fetchone()
    return row is not None


def _table_columns(conn: sqlite3.Connection, table_name: str) -> set[str]:
    rows = conn.execute(f"PRAGMA table_info({table_name})").fetchall()
    return {row["name"] for row in rows}


def _ensure_column(
    conn: sqlite3.Connection,
    table_name: str,
    column_name: str,
    column_sql: str,
) -> None:
    if not _table_exists(conn, table_name):
        return

    if column_name in _table_columns(conn, table_name):
        return

    conn.execute(f"ALTER TABLE {table_name} ADD COLUMN {column_sql}")


def _normalize_legacy_schema(conn: sqlite3.Connection) -> None:
    _ensure_column(
        conn,
        "chat_sessions",
        "knowledge_version",
        "knowledge_version TEXT NOT NULL DEFAULT 'tax_code_2026_v1'",
    )
    _ensure_column(
        conn,
        "chat_sessions",
        "updated_at",
        "updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00+00:00'",
    )
    _ensure_column(
        conn,
        "chat_sessions",
        "user_id",
        "user_id TEXT REFERENCES users(id)",
    )
    _ensure_column(conn, "chat_sessions", "title", "title TEXT")
    conn.execute("CREATE INDEX IF NOT EXISTS idx_sessions_user ON chat_sessions(user_id)")

    _ensure_column(conn, "chat_messages", "advice_json", "advice_json TEXT")
    _ensure_column(conn, "chat_messages", "confidence", "confidence REAL")

    _ensure_column(
        conn,
        "taxpayer_profiles",
        "session_id",
        "session_id TEXT UNIQUE REFERENCES chat_sessions(id) ON DELETE CASCADE",
    )
    _ensure_column(
        conn,
        "taxpayer_profiles",
        "user_id",
        "user_id TEXT REFERENCES users(id)",
    )
    _ensure_column(conn, "taxpayer_profiles", "taxpayer_type", "taxpayer_type TEXT")
    _ensure_column(conn, "taxpayer_profiles", "tax_regime", "tax_regime TEXT")
    _ensure_column(conn, "taxpayer_profiles", "annual_income_kzt", "annual_income_kzt REAL")
    _ensure_column(conn, "taxpayer_profiles", "employees_count", "employees_count INTEGER")
    _ensure_column(conn, "taxpayer_profiles", "activity_type", "activity_type TEXT")
    _ensure_column(conn, "taxpayer_profiles", "has_foreign_income", "has_foreign_income INTEGER")
    _ensure_column(conn, "taxpayer_profiles", "has_rental_income", "has_rental_income INTEGER")
    _ensure_column(conn, "taxpayer_profiles", "residency_status", "residency_status TEXT")
    _ensure_column(
        conn,
        "taxpayer_profiles",
        "updated_at",
        "updated_at TEXT NOT NULL DEFAULT (datetime('now'))",
    )
    _ensure_column(conn, "taxpayer_profiles", "language", "language TEXT DEFAULT 'ru'")
    conn.execute("CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user ON taxpayer_profiles(user_id)")


def _ensure_migration_table(conn: sqlite3.Connection) -> None:
    conn.execute(
        """
        CREATE TABLE IF NOT EXISTS schema_migrations (
            filename TEXT PRIMARY KEY,
            applied_at TEXT NOT NULL
        )
        """
    )


def _get_applied_migrations(conn: sqlite3.Connection) -> set[str]:
    rows = conn.execute("SELECT filename FROM schema_migrations").fetchall()
    return {row["filename"] for row in rows}


def _execute_migration_statement(conn: sqlite3.Connection, statement: str) -> None:
    try:
        conn.execute(statement)
    except sqlite3.OperationalError as exc:
        if "duplicate column name" in str(exc).lower():
            return
        raise


def _execute_bootstrap_statement(conn: sqlite3.Connection, statement: str) -> None:
    try:
        conn.execute(statement)
    except sqlite3.OperationalError as exc:
        error_text = str(exc).lower()
        if "already exists" in error_text:
            return
        if "no such column" in error_text and "index if not exists" in statement.lower():
            return
        raise


def _apply_migration(conn: sqlite3.Connection, migration_path: Path) -> None:
    script = migration_path.read_text(encoding="utf-8")
    for statement in _split_sql_statements(script):
        _execute_migration_statement(conn, statement)

    conn.execute(
        "INSERT INTO schema_migrations (filename, applied_at) VALUES (?, ?)",
        (migration_path.name, _utc_now_iso()),
    )
    conn.commit()


def get_connection() -> sqlite3.Connection:
    db_path = get_db_path()
    db_path.parent.mkdir(parents=True, exist_ok=True)

    conn = sqlite3.connect(str(db_path))
    conn.row_factory = sqlite3.Row
    conn.execute("PRAGMA journal_mode=WAL")
    conn.execute("PRAGMA foreign_keys=ON")
    return conn


def _seed_test_user() -> None:
    if get_user_by_email(TEST_USER_EMAIL):
        return

    password_hash = bcrypt.hashpw(b"123", bcrypt.gensalt()).decode()
    create_user(
        TEST_USER_ID,
        TEST_USER_EMAIL,
        password_hash,
        TEST_USER_NAME,
    )


def init_db() -> None:
    migrations_path = get_migrations_path()
    migrations_path.mkdir(parents=True, exist_ok=True)

    conn = get_connection()
    try:
        for statement in _split_sql_statements(_DDL):
            _execute_bootstrap_statement(conn, statement)
        _ensure_migration_table(conn)
        applied_migrations = _get_applied_migrations(conn)

        for migration_path in sorted(migrations_path.glob("*.sql")):
            if migration_path.name in applied_migrations:
                continue
            _apply_migration(conn, migration_path)

        _normalize_legacy_schema(conn)
        conn.commit()
    finally:
        conn.close()

    _seed_test_user()


def create_user(
    user_id: str,
    email: str,
    password_hash: str,
    name: str,
    created_at: str | None = None,
) -> dict[str, Any]:
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO users (id, email, password_hash, name, created_at)
            VALUES (?, ?, ?, ?, ?)
            """,
            (user_id, email, password_hash, name, created_at or _utc_now_iso()),
        )
        conn.commit()
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _row_to_dict(row) or {}
    finally:
        conn.close()


def get_user_by_email(email: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM users WHERE email = ?", (email,)).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def get_user_by_id(user_id: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        row = conn.execute("SELECT * FROM users WHERE id = ?", (user_id,)).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def create_session(
    session_id: str,
    user_id: str | None = None,
    created_at: str | None = None,
    knowledge_version: str = DEFAULT_KNOWLEDGE_VERSION,
    status: str = "active",
    title: str | None = None,
) -> dict[str, Any]:
    if created_at is None and _looks_like_timestamp(user_id):
        created_at = user_id
        user_id = None

    timestamp = created_at or _utc_now_iso()
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO chat_sessions (
                id,
                status,
                knowledge_version,
                user_id,
                title,
                created_at,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (session_id, status, knowledge_version, user_id, title, timestamp, timestamp),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM chat_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        return _row_to_dict(row) or {}
    finally:
        conn.close()


def get_session(session_id: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM chat_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def get_sessions_by_user(user_id: str) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        rows = conn.execute(
            """
            SELECT * FROM chat_sessions
            WHERE user_id = ?
            ORDER BY created_at DESC, id DESC
            """,
            (user_id,),
        ).fetchall()
        return [_row_to_dict(row) or {} for row in rows]
    finally:
        conn.close()


def update_session_status(
    session_id: str,
    status: str,
    updated_at: str | None = None,
) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE chat_sessions SET status = ?, updated_at = ? WHERE id = ?",
            (status, updated_at or _utc_now_iso(), session_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM chat_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def delete_session(session_id: str) -> bool:
    conn = get_connection()
    try:
        conn.execute("DELETE FROM chat_messages WHERE session_id = ?", (session_id,))
        conn.execute("DELETE FROM chat_sessions WHERE id = ?", (session_id,))
        conn.commit()
        return True
    finally:
        conn.close()


def update_session_title(session_id: str, title: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        conn.execute(
            "UPDATE chat_sessions SET title = ?, updated_at = ? WHERE id = ?",
            (title, _utc_now_iso(), session_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM chat_sessions WHERE id = ?",
            (session_id,),
        ).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def insert_message(
    msg_id: str,
    session_id: str,
    role: str,
    content: str,
    created_at: str,
    advice_json: Any = None,
    confidence: float | None = None,
) -> dict[str, Any]:
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO chat_messages (
                id,
                session_id,
                role,
                content,
                advice_json,
                confidence,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                msg_id,
                session_id,
                role,
                content,
                _encode_json_value(advice_json),
                confidence,
                created_at,
            ),
        )
        conn.execute(
            "UPDATE chat_sessions SET updated_at = ? WHERE id = ?",
            (created_at, session_id),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM chat_messages WHERE id = ?",
            (msg_id,),
        ).fetchone()
        return _row_to_dict(row) or {}
    finally:
        conn.close()


def get_message(message_id: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM chat_messages WHERE id = ?",
            (message_id,),
        ).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def get_messages(session_id: str) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM chat_messages WHERE session_id = ? ORDER BY created_at, rowid",
            (session_id,),
        ).fetchall()
        return [_row_to_dict(row) or {} for row in rows]
    finally:
        conn.close()


def _get_profile_by_session(session_id: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM taxpayer_profiles WHERE session_id = ?",
            (session_id,),
        ).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def get_profile_by_user(user_id: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM taxpayer_profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def get_or_create_profile_by_user(user_id: str) -> dict[str, Any]:
    existing = get_profile_by_user(user_id)
    if existing:
        return existing

    timestamp = _utc_now_iso()
    profile_id = str(uuid.uuid4())
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO taxpayer_profiles (
                id,
                session_id,
                user_id,
                taxpayer_type,
                tax_regime,
                annual_income_kzt,
                employees_count,
                activity_type,
                has_foreign_income,
                has_rental_income,
                residency_status,
                updated_at
            )
            VALUES (?, NULL, ?, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL, ?)
            """,
            (profile_id, user_id, timestamp),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM taxpayer_profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        return _row_to_dict(row) or {}
    finally:
        conn.close()


def update_profile_by_user(
    user_id: str,
    fields: dict[str, Any],
    updated_at: str | None = None,
) -> dict[str, Any]:
    current = get_or_create_profile_by_user(user_id)
    payload = {field: current.get(field) for field in PROFILE_FIELDS}

    for field, value in fields.items():
        if field in payload:
            payload[field] = value

    timestamp = updated_at or _utc_now_iso()
    conn = get_connection()
    try:
        conn.execute(
            """
            UPDATE taxpayer_profiles
            SET taxpayer_type = ?,
                tax_regime = ?,
                annual_income_kzt = ?,
                employees_count = ?,
                activity_type = ?,
                has_foreign_income = ?,
                has_rental_income = ?,
                residency_status = ?,
                oked_code = ?,
                oked_name = ?,
                oked_banned = ?,
                language = ?,
                updated_at = ?
            WHERE user_id = ?
            """,
            (
                payload["taxpayer_type"],
                payload["tax_regime"],
                payload["annual_income_kzt"],
                payload["employees_count"],
                payload["activity_type"],
                payload["has_foreign_income"],
                payload["has_rental_income"],
                payload["residency_status"],
                payload.get("oked_code"),
                payload.get("oked_name"),
                payload.get("oked_banned", 0),
                payload.get("language", "ru"),
                timestamp,
                user_id,
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM taxpayer_profiles WHERE user_id = ?",
            (user_id,),
        ).fetchone()
        return _row_to_dict(row) or {}
    finally:
        conn.close()


def upsert_taxpayer_profile(
    session_id: str,
    profile: dict[str, Any],
    updated_at: str | None = None,
) -> dict[str, Any]:
    session = get_session(session_id)
    if session and session.get("user_id"):
        updated = update_profile_by_user(session["user_id"], profile, updated_at=updated_at)

        conn = get_connection()
        try:
            conn.execute(
                "UPDATE taxpayer_profiles SET session_id = COALESCE(session_id, ?) WHERE user_id = ?",
                (session_id, session["user_id"]),
            )
            conn.commit()
        finally:
            conn.close()

        return get_profile_by_user(session["user_id"]) or updated

    existing = _get_profile_by_session(session_id)
    payload = {field: profile.get(field) for field in PROFILE_FIELDS if field in profile}
    if existing:
        for field in PROFILE_FIELDS:
            if field not in payload:
                payload[field] = existing.get(field)
        profile_id = existing["id"]
        user_id = existing.get("user_id")
    else:
        for field in PROFILE_FIELDS:
            payload.setdefault(field, None)
        profile_id = str(uuid.uuid4())
        user_id = None

    timestamp = updated_at or _utc_now_iso()
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO taxpayer_profiles (
                id,
                session_id,
                user_id,
                taxpayer_type,
                tax_regime,
                annual_income_kzt,
                employees_count,
                activity_type,
                has_foreign_income,
                has_rental_income,
                residency_status,
                updated_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(session_id) DO UPDATE SET
                user_id = excluded.user_id,
                taxpayer_type = excluded.taxpayer_type,
                tax_regime = excluded.tax_regime,
                annual_income_kzt = excluded.annual_income_kzt,
                employees_count = excluded.employees_count,
                activity_type = excluded.activity_type,
                has_foreign_income = excluded.has_foreign_income,
                has_rental_income = excluded.has_rental_income,
                residency_status = excluded.residency_status,
                updated_at = excluded.updated_at
            """,
            (
                profile_id,
                session_id,
                user_id,
                payload["taxpayer_type"],
                payload["tax_regime"],
                payload["annual_income_kzt"],
                payload["employees_count"],
                payload["activity_type"],
                payload["has_foreign_income"],
                payload["has_rental_income"],
                payload["residency_status"],
                timestamp,
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM taxpayer_profiles WHERE session_id = ?",
            (session_id,),
        ).fetchone()
        return _row_to_dict(row) or {}
    finally:
        conn.close()

def get_taxpayer_profile(session_id: str) -> dict[str, Any] | None:
    session = get_session(session_id)
    if session and session.get("user_id"):
        profile = get_profile_by_user(session["user_id"])
        if profile:
            return profile

    return _get_profile_by_session(session_id)


def delete_profile_by_user(user_id: str) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM taxpayer_profiles WHERE user_id = ?",
            (user_id,),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def delete_taxpayer_profile(session_id: str) -> bool:
    session = get_session(session_id)
    if session and session.get("user_id"):
        return delete_profile_by_user(session["user_id"])

    conn = get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM taxpayer_profiles WHERE session_id = ?",
            (session_id,),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def save_extracted_fact(
    fact_id: str,
    session_id: str,
    fact_key: str,
    created_at: str,
    fact_value: str | None = None,
    confidence: float | None = None,
    message_id: str | None = None,
) -> dict[str, Any]:
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO extracted_facts (
                id,
                session_id,
                message_id,
                fact_key,
                fact_value,
                confidence,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                session_id = excluded.session_id,
                message_id = excluded.message_id,
                fact_key = excluded.fact_key,
                fact_value = excluded.fact_value,
                confidence = excluded.confidence,
                created_at = excluded.created_at
            """,
            (fact_id, session_id, message_id, fact_key, fact_value, confidence, created_at),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM extracted_facts WHERE id = ?",
            (fact_id,),
        ).fetchone()
        return _row_to_dict(row) or {}
    finally:
        conn.close()


def get_extracted_fact(fact_id: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM extracted_facts WHERE id = ?",
            (fact_id,),
        ).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def list_extracted_facts(session_id: str) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM extracted_facts WHERE session_id = ? ORDER BY created_at, id",
            (session_id,),
        ).fetchall()
        return [_row_to_dict(row) or {} for row in rows]
    finally:
        conn.close()


def delete_extracted_fact(fact_id: str) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM extracted_facts WHERE id = ?",
            (fact_id,),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def save_answer_citation(
    citation_id: str,
    message_id: str,
    created_at: str,
    article_number: str | None = None,
    article_title: str | None = None,
    snippet: str | None = None,
    score: float | None = None,
) -> dict[str, Any]:
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO answer_citations (
                id,
                message_id,
                article_number,
                article_title,
                snippet,
                score,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                message_id = excluded.message_id,
                article_number = excluded.article_number,
                article_title = excluded.article_title,
                snippet = excluded.snippet,
                score = excluded.score,
                created_at = excluded.created_at
            """,
            (
                citation_id,
                message_id,
                article_number,
                article_title,
                snippet,
                score,
                created_at,
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM answer_citations WHERE id = ?",
            (citation_id,),
        ).fetchone()
        return _row_to_dict(row) or {}
    finally:
        conn.close()


def get_answer_citation(citation_id: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM answer_citations WHERE id = ?",
            (citation_id,),
        ).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def list_answer_citations(message_id: str) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM answer_citations WHERE message_id = ? ORDER BY created_at, id",
            (message_id,),
        ).fetchall()
        return [_row_to_dict(row) or {} for row in rows]
    finally:
        conn.close()


def delete_answer_citation(citation_id: str) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM answer_citations WHERE id = ?",
            (citation_id,),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def save_feedback(
    feedback_id: str,
    message_id: str,
    rating: str,
    created_at: str,
    reason: str | None = None,
) -> dict[str, Any]:
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO feedback (
                id,
                message_id,
                rating,
                reason,
                created_at
            )
            VALUES (?, ?, ?, ?, ?)
            ON CONFLICT(id) DO UPDATE SET
                message_id = excluded.message_id,
                rating = excluded.rating,
                reason = excluded.reason,
                created_at = excluded.created_at
            """,
            (feedback_id, message_id, rating, reason, created_at),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM feedback WHERE id = ?",
            (feedback_id,),
        ).fetchone()
        return _row_to_dict(row) or {}
    finally:
        conn.close()


def get_feedback(feedback_id: str) -> dict[str, Any] | None:
    conn = get_connection()
    try:
        row = conn.execute(
            "SELECT * FROM feedback WHERE id = ?",
            (feedback_id,),
        ).fetchone()
        return _row_to_dict(row)
    finally:
        conn.close()


def list_feedback_for_message(message_id: str) -> list[dict[str, Any]]:
    conn = get_connection()
    try:
        rows = conn.execute(
            "SELECT * FROM feedback WHERE message_id = ? ORDER BY created_at, id",
            (message_id,),
        ).fetchall()
        return [_row_to_dict(row) or {} for row in rows]
    finally:
        conn.close()


def delete_feedback(feedback_id: str) -> bool:
    conn = get_connection()
    try:
        cursor = conn.execute(
            "DELETE FROM feedback WHERE id = ?",
            (feedback_id,),
        )
        conn.commit()
        return cursor.rowcount > 0
    finally:
        conn.close()


def insert_error_log(
    error_id: str,
    error_type: str,
    error_message: str,
    user_id: str | None = None,
    session_id: str | None = None,
    stack_trace: str | None = None,
    created_at: str | None = None,
) -> dict[str, Any]:
    conn = get_connection()
    try:
        conn.execute(
            """
            INSERT INTO error_logs (
                id,
                user_id,
                session_id,
                error_type,
                error_message,
                stack_trace,
                created_at
            )
            VALUES (?, ?, ?, ?, ?, ?, ?)
            """,
            (
                error_id,
                user_id,
                session_id,
                error_type,
                error_message,
                stack_trace,
                created_at or _utc_now_iso(),
            ),
        )
        conn.commit()
        row = conn.execute(
            "SELECT * FROM error_logs WHERE id = ?",
            (error_id,),
        ).fetchone()
        return _row_to_dict(row) or {}
    finally:
        conn.close()
