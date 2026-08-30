-- Bootstrap a plain Postgres (e.g. Railway) so the app's Supabase-style
-- schema, RLS policies and PostgREST work unchanged. Run ONCE as the
-- database owner/superuser BEFORE schema.sql and the migrations, then run
-- postgrest-grants.sql AFTER them.
--
-- Replace :'authenticator_password' via psql -v, e.g.
--   psql "$DATABASE_URL" -v authenticator_password='...' -f supabase/postgrest-bootstrap.sql

CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Roles PostgREST switches into. Only service_role is ever used by the app
-- (server-side, BYPASSRLS); anon/authenticated exist so policies referencing
-- them are valid and so a future public API could use them.
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

-- The login role PostgREST connects as. psql does not substitute :'vars'
-- inside $$ blocks, so this is done with \gexec instead.
SELECT format('CREATE ROLE authenticator LOGIN NOINHERIT PASSWORD %L', :'authenticator_password')
WHERE NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') \gexec
SELECT format('ALTER ROLE authenticator WITH LOGIN NOINHERIT PASSWORD %L', :'authenticator_password')
WHERE EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticator') \gexec

GRANT anon, authenticated, service_role TO authenticator;

-- Minimal stand-in for Supabase's auth schema so RLS policies that call
-- auth.uid() / auth.role() / auth.jwt() compile and behave the same way
-- (claims come from PostgREST's request.jwt.claims setting).
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

GRANT USAGE ON SCHEMA public, auth TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;
