-- Run AFTER schema.sql and all migrations (and again after any future
-- migration that adds tables/sequences/functions): gives PostgREST's
-- service_role full access to the public schema. RLS is bypassed by
-- service_role; anon/authenticated get nothing here on purpose.

GRANT USAGE ON SCHEMA public TO service_role;
GRANT ALL ON ALL TABLES IN SCHEMA public TO service_role;
GRANT ALL ON ALL SEQUENCES IN SCHEMA public TO service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO service_role;

-- Future objects created by the owner inherit the same grants.
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON TABLES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT ALL ON SEQUENCES TO service_role;
ALTER DEFAULT PRIVILEGES IN SCHEMA public GRANT EXECUTE ON FUNCTIONS TO service_role;

-- Tell PostgREST to reload its schema cache.
NOTIFY pgrst, 'reload schema';
