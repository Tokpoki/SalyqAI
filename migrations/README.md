# Миграции (Магжан)

SQL-файлы для изменения структуры базы данных.

## Правила

1. Только добавлять новые файлы, никогда не менять старые
2. Формат имён: `0001_init.sql`, `0002_add_profiles.sql`
3. Текущая целевая схема: `docs/db-schema.sql`

## Пример

```sql
-- 0002_add_profiles.sql
CREATE TABLE IF NOT EXISTS taxpayer_profiles (
  id UUID PRIMARY KEY,
  session_id UUID NOT NULL REFERENCES chat_sessions(id),
  taxpayer_type TEXT,
  tax_regime TEXT,
  ...
);
```
