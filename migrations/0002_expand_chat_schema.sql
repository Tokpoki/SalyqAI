ALTER TABLE chat_sessions
ADD COLUMN knowledge_version TEXT NOT NULL DEFAULT 'tax_code_2026_v1';

ALTER TABLE chat_sessions
ADD COLUMN updated_at TEXT NOT NULL DEFAULT '1970-01-01T00:00:00+00:00';

ALTER TABLE chat_messages
ADD COLUMN advice_json TEXT;

ALTER TABLE chat_messages
ADD COLUMN confidence REAL;
