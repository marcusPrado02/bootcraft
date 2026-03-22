# Migrations

This directory contains SQL migration files for the **{{projectName}}** service.

## Naming Convention

```
{timestamp}_{description}.sql
```

Examples:

- `20240101000000_create_initial_schema.sql`
- `20240215123456_add_users_table.sql`
- `20240320090000_add_index_on_created_at.sql`

## Rules

1. **Migrations are append-only** — never edit or delete an applied migration.
2. **Each file is a single transaction** — wrap DDL in `BEGIN; ... COMMIT;`.
3. **Down migrations are not supported** — if a rollback is needed, write a new migration.
4. **Descriptive names** — the description should explain what changes, not why (the why belongs in a commit message or ADR).

## Running Migrations

Use your migration runner of choice (e.g., `node-pg-migrate`, `Flyway`, `Liquibase`, or a bespoke script).

Recommended setup: add a `db:migrate` npm script that points to your runner.

## Example Migration File

```sql
-- 20240101000000_create_initial_schema.sql
BEGIN;

CREATE TABLE IF NOT EXISTS example (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);

COMMIT;
```
