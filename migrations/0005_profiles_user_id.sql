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
    updated_at TEXT NOT NULL DEFAULT (datetime('now'))
);

ALTER TABLE taxpayer_profiles ADD COLUMN user_id TEXT REFERENCES users(id);

CREATE UNIQUE INDEX IF NOT EXISTS idx_profiles_user
ON taxpayer_profiles(user_id);
