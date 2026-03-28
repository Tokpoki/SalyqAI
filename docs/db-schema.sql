-- Salyq AI schema (SQLite MVP / PostgreSQL target)

-- ========== USERS ==========

create table if not exists users (
  id text primary key,
  email text not null unique,
  password_hash text not null,
  name text not null,
  created_at text not null default (datetime('now'))
);

create unique index if not exists idx_users_email on users(email);

-- ========== CHAT SESSIONS ==========

create table if not exists chat_sessions (
  id text primary key,
  user_id text not null references users(id) on delete cascade,
  title text,
  status text not null default 'active',
  knowledge_version text not null default 'tax_code_2026_v1',
  created_at text not null default (datetime('now')),
  updated_at text not null default (datetime('now'))
);

create index if not exists idx_sessions_user on chat_sessions(user_id);

-- ========== TAXPAYER PROFILES (per user) ==========

create table if not exists taxpayer_profiles (
  id text primary key,
  user_id text not null unique references users(id) on delete cascade,
  taxpayer_type text,
  tax_regime text,
  annual_income_kzt real,
  employees_count integer,
  activity_type text,
  has_foreign_income integer,
  has_rental_income integer,
  residency_status text,
  updated_at text not null default (datetime('now'))
);

-- ========== CHAT MESSAGES ==========

create table if not exists chat_messages (
  id text primary key,
  session_id text not null references chat_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  advice_json text,
  confidence real,
  created_at text not null default (datetime('now'))
);

-- ========== EXTRACTED FACTS ==========

create table if not exists extracted_facts (
  id text primary key,
  session_id text not null references chat_sessions(id) on delete cascade,
  message_id text references chat_messages(id) on delete set null,
  fact_key text not null,
  fact_value text,
  confidence real,
  created_at text not null default (datetime('now'))
);

-- ========== ANSWER CITATIONS ==========

create table if not exists answer_citations (
  id text primary key,
  message_id text not null references chat_messages(id) on delete cascade,
  article_number text,
  article_title text,
  snippet text,
  score real,
  created_at text not null default (datetime('now'))
);

-- ========== FEEDBACK ==========

create table if not exists feedback (
  id text primary key,
  message_id text not null references chat_messages(id) on delete cascade,
  user_id text references users(id),
  rating text not null,
  reason text,
  created_at text not null default (datetime('now'))
);

-- ========== ERROR LOGS ==========

create table if not exists error_logs (
  id text primary key,
  user_id text references users(id),
  session_id text,
  error_type text not null,
  error_message text not null,
  stack_trace text,
  created_at text not null default (datetime('now'))
);
