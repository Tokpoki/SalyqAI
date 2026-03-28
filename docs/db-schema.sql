-- Salyq AI MVP schema (PostgreSQL)

create table if not exists chat_sessions (
  id uuid primary key,
  status text not null default 'active',
  knowledge_version text not null default 'tax_code_2026_v1',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table if not exists taxpayer_profiles (
  id uuid primary key,
  session_id uuid not null unique references chat_sessions(id) on delete cascade,
  taxpayer_type text,
  tax_regime text,
  annual_income_kzt numeric,
  employees_count integer,
  activity_type text,
  has_foreign_income boolean,
  has_rental_income boolean,
  residency_status text,
  updated_at timestamptz not null default now()
);

create table if not exists chat_messages (
  id uuid primary key,
  session_id uuid not null references chat_sessions(id) on delete cascade,
  role text not null,
  content text not null,
  advice_json jsonb,
  confidence numeric,
  created_at timestamptz not null default now()
);

create table if not exists extracted_facts (
  id uuid primary key,
  session_id uuid not null references chat_sessions(id) on delete cascade,
  message_id uuid references chat_messages(id) on delete set null,
  fact_key text not null,
  fact_value text,
  confidence numeric,
  created_at timestamptz not null default now()
);

create table if not exists answer_citations (
  id uuid primary key,
  message_id uuid not null references chat_messages(id) on delete cascade,
  article_number text,
  article_title text,
  snippet text,
  score numeric,
  created_at timestamptz not null default now()
);

create table if not exists feedback (
  id uuid primary key,
  message_id uuid not null references chat_messages(id) on delete cascade,
  rating text not null,
  reason text,
  created_at timestamptz not null default now()
);
