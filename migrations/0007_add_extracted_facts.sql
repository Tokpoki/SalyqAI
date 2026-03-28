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
