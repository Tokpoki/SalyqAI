ALTER TABLE chat_sessions ADD COLUMN user_id TEXT REFERENCES users(id);

ALTER TABLE chat_sessions ADD COLUMN title TEXT;

CREATE INDEX IF NOT EXISTS idx_sessions_user
ON chat_sessions(user_id);
