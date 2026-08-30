# Database on Railway (PostgREST + Postgres)

The app talks to its database through Supabase's REST protocol (`supabase-js`).
Since August 2026 that REST layer is a self-hosted **PostgREST** container on
Railway in front of a Railway **Postgres** service, instead of a hosted
Supabase project (the free tier's 500 MB cap could not hold the 1.25 GB
Lichess puzzle table). The application code is unchanged; only environment
variables differ.

## Services (Railway project: KZN Chess)

| Service | Image / type | Purpose |
|---|---|---|
| `Postgres` | Railway Postgres plugin | The database (volume-backed) |
| `postgrest` | `postgrest/postgrest` | REST API the app calls (public URL, JWT-only — no anonymous role) |
| app service | this repo (Nixpacks) | Next.js; has a volume mounted at `/data/uploads` for images |

## Environment variables

**postgrest**

| Variable | Value |
|---|---|
| `PGRST_DB_URI` | `postgresql://authenticator:<pw>@<Postgres private host>:5432/railway` |
| `PGRST_DB_SCHEMAS` | `public` |
| `PGRST_JWT_SECRET` | from `node scripts/mint-postgrest-keys.mjs` |
| `PGRST_SERVER_HOST` | `*` |
| `PGRST_SERVER_PORT` | `3000` |
| `PGRST_DB_POOL` | `10` |

`PGRST_DB_ANON_ROLE` is deliberately **unset**: requests without a valid
service-role JWT are rejected with 401.

**app service**

| Variable | Value |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | `https://<postgrest domain>` |
| `SUPABASE_REST_BARE` | `true` (strips the `/rest/v1` prefix supabase-js adds) |
| `SUPABASE_SERVICE_ROLE_KEY` | service key from `mint-postgrest-keys.mjs` |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | anon key from the same script (unused by the app, kept for the client module) |
| `DATABASE_URL` | Railway Postgres URL (private) |
| `UPLOAD_DIR` | `/data/uploads` |

## One-time bootstrap / restore

Postgres client tools are required (`psql`). Order matters:

```bash
psql "$DATABASE_URL" -v authenticator_password='...' -f supabase/postgrest-bootstrap.sql
psql "$DATABASE_URL" -f supabase/schema.sql
for f in supabase/migrations/*.sql; do psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f "$f"; done
psql "$DATABASE_URL" -f supabase/postgrest-grants.sql
# then load data (COPY blocks) if restoring from a dump
```

`postgrest-bootstrap.sql` creates the `anon` / `authenticated` /
`service_role` / `authenticator` roles and a stub `auth.uid()` / `auth.role()`
/ `auth.jwt()` schema so the existing RLS policies compile.
`postgrest-grants.sql` must be re-run after any migration that adds tables,
sequences or functions (it also `NOTIFY pgrst` to reload the schema cache).

## Applying a new migration

```bash
psql "$DATABASE_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/NNN_name.sql
psql "$DATABASE_URL" -f supabase/postgrest-grants.sql
```

## Keys

A Supabase "key" is an HS256 JWT whose `role` claim is a Postgres role.
`node scripts/mint-postgrest-keys.mjs [existing-secret]` prints
`PGRST_JWT_SECRET`, a `service_role` key and an `anon` key. Rotating the
secret invalidates all keys: update `PGRST_JWT_SECRET` on `postgrest` and the
two keys on the app service together.

## Uploads

With `UPLOAD_DIR` set, `/api/upload` writes files to
`<UPLOAD_DIR>/<folder>/<name>` and returns `/api/media/<folder>/<name>`,
served by `src/app/api/media/[...path]/route.ts` with immutable caching. The
directory is a Railway volume, so it survives deploys. Without `UPLOAD_DIR`
the route falls back to Supabase Storage (legacy).

## Backups

Railway does not back up the database for you on the Hobby plan. Enable
volume backups on the Postgres service in the Railway dashboard, and/or run
`pg_dump "$DATABASE_PUBLIC_URL" -Fc -f kznchess-$(date +%F).dump` periodically
and keep the file off Railway.
