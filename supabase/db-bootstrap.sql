-- Bootstrap a plain Postgres (Railway) for this app. Run ONCE as the
-- database owner BEFORE schema.sql and the migrations:
--   psql "$DATABASE_URL" -f supabase/db-bootstrap.sql
--
-- The app connects directly as the owner role (src/lib/db), which bypasses
-- RLS the same way Supabase's service_role did. The auth schema stub exists
-- only so the schema's RLS policies (auth.uid() etc.) compile unchanged.

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE SCHEMA IF NOT EXISTS auth;

CREATE OR REPLACE FUNCTION auth.jwt() RETURNS jsonb
LANGUAGE sql STABLE AS $$
  SELECT coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;

CREATE OR REPLACE FUNCTION auth.uid() RETURNS uuid
LANGUAGE sql STABLE AS $$
  SELECT nullif(auth.jwt() ->> 'sub', '')::uuid
$$;

CREATE OR REPLACE FUNCTION auth.role() RETURNS text
LANGUAGE sql STABLE AS $$
  SELECT auth.jwt() ->> 'role'
$$;
