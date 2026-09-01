# Database on Railway (direct Postgres)

Since August 2026 the database is a Railway **Postgres** service and the app
talks to it **directly over the private network** with a connection pool —
no hosted Supabase, no PostgREST, no API layer. (The original Supabase
project hit the free tier's 500 MB cap: the Lichess puzzle table alone is
1.25 GB.)

The application code still *calls* the supabase-js query-builder API in 79
files; `createServerClient()` (src/lib/supabase/server.ts) returns a
direct-SQL implementation of exactly that call surface (src/lib/db —
parsers, FK-introspected embedded joins, typed parameter binding, `{ data,
error }` semantics), selected by `DB_DIRECT=true`. Without the flag it falls
back to the original hosted-Supabase client, so local dev against a Supabase
project still works.

## Services

| Service | Purpose |
|---|---|
| app (this repo) | Next.js; volume mounted at `/data/uploads` for images |
| Postgres | Railway Postgres plugin, volume-backed |

## App service environment

**Required — the app is broken without these:**

| Variable | Value | Symptom if missing |
|---|---|---|
| `DB_DIRECT` | `true` | Falls back to Supabase → every query fails |
| `DATABASE_URL` | the Postgres service's private URL (`${{Postgres.DATABASE_URL}}`) | No database at all |
| `NEXTAUTH_SECRET` | 32+ random bytes (`openssl rand -base64 32`) | **`/auth` and all `/api/auth/*` return 500** ("problem with the server configuration"); nobody can sign in |
| `NEXTAUTH_URL` | `https://www.kznchess.co.za` | Sign-in redirects land on the wrong host |
| `UPLOAD_DIR` | `/data/uploads` | Uploads try dead Supabase Storage |

**Optional — features degrade quietly:**

| Variable | Effect if missing |
|---|---|
| `NEXT_PUBLIC_SITE_URL` | Share/OG links use the `https://kznchess.co.za` default (non-www) |
| `NEXT_PUBLIC_CONTACT_EMAIL` | Falls back to `keagangilmore@gmail.com` |
| `NEXT_PUBLIC_ADSENSE_PUB_ID`, `NEXT_PUBLIC_ADSENSE_SLOT_*` | Ad slots render nothing |
| `NODE_VERSION` | Build uses Node 18 (deprecation warnings); set `20` |

`NEXT_PUBLIC_*` values are inlined at build time, so changing one needs a
rebuild, not just a restart. `NEXT_PUBLIC_SUPABASE_URL` /
`SUPABASE_SERVICE_ROLE_KEY` / `NEXT_PUBLIC_SUPABASE_ANON_KEY` are unused in
direct mode and can be deleted — but delete them **individually**, not by
clearing the variable list, or `NEXTAUTH_SECRET` goes with them.

Changing `NEXTAUTH_SECRET` invalidates existing sessions (everyone is signed
out once). Stored passwords are bcrypt hashes in the database and are
unaffected.

## One-time bootstrap / restore

Requires `psql`. Order matters:

```bash
psql "$DATABASE_PUBLIC_URL" -f supabase/db-bootstrap.sql   # extensions + auth.* stub
psql "$DATABASE_PUBLIC_URL" -f supabase/schema.sql
for f in supabase/migrations/*.sql; do psql "$DATABASE_PUBLIC_URL" -v ON_ERROR_STOP=1 -f "$f"; done
# then load data (COPY blocks) if restoring from a dump
```

`db-bootstrap.sql` creates `uuid-ossp`/`pgcrypto` and a stub `auth.uid()` /
`auth.role()` / `auth.jwt()` schema so the RLS policies in schema.sql compile
unchanged. The app connects as the database owner, which bypasses RLS the
same way Supabase's service role did.

## Applying a new migration

```bash
psql "$DATABASE_PUBLIC_URL" -v ON_ERROR_STOP=1 -f supabase/migrations/NNN_name.sql
```

No schema-cache reload is needed (there is no PostgREST); the adapter
re-introspects foreign keys on each deploy (process start).

## Adding new query patterns

src/lib/db supports the audited supabase-js subset (see
`src/lib/db/builder.ts`); unsupported operators **throw** rather than guess.
If a new call site needs a new operator/feature, add it to the builder WITH a
unit test in `src/lib/db/__tests__/`, or write plain SQL via
`getPool().query(...)`.

## Uploads

With `UPLOAD_DIR` set, `/api/upload` writes files to
`<UPLOAD_DIR>/<folder>/<name>` and returns `/api/media/<folder>/<name>`,
served by `src/app/api/media/[...path]/route.ts` with immutable caching. The
directory is a Railway volume, so it survives deploys.

## Backups

Railway does not back up the database for you. Enable volume backups on the
Postgres service in the Railway dashboard, and/or run
`pg_dump "$DATABASE_PUBLIC_URL" -Fc -f kznchess-$(date +%F).dump`
periodically and keep a copy off Railway. The 2026-08-15 Supabase outage is
the cautionary tale.
