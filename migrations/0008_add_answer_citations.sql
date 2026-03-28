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
