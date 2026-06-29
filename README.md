# KZN Chess Tournament Hub

The central platform for all chess tournaments across KwaZulu-Natal, South Africa.

**Live at:** [kznchess.co.za](https://kznchess.co.za)

## Tech Stack

- **Framework:** Next.js 14 (App Router)
- **Language:** TypeScript
- **Styling:** Tailwind CSS + shadcn/ui
- **Animations:** Framer Motion
- **Auth:** NextAuth.js (Credentials + JWT)
- **Database:** Supabase (Postgres + Auth + Storage)
- **Deployment:** Railway

## Features

### Public
- Homepage with animated hero, stats counters, and upcoming tournaments
- Tournament browser with filtering by district, date, and rated/unrated
- Calendar view showing tournament schedules
- Tournament detail pages with WhatsApp sharing
- User registration and login

### Organizer
- Submit tournaments for admin approval
- Preview tournament cards before submitting

### Admin CMS
- Dashboard with stats overview and pending approvals
- Tournament management (approve, reject, feature, edit)
- Organizer and user management with role changes
- District management with coordinator info
- Site content editor (hero text, about page) and announcement banners
- Audit log of all admin actions

## Getting Started

### Prerequisites

- Node.js 18+
- A Supabase project

### 1. Clone and install

```bash
git clone <repo-url>
cd KZNchess
npm install
```

### 2. Set up environment variables

Copy `.env.example` to `.env` and fill in your values:

```bash
cp .env.example .env
```

Required variables:

| Variable | Description |
|---|---|
| `NEXT_PUBLIC_SUPABASE_URL` | Your Supabase project URL |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Supabase anonymous key |
| `SUPABASE_SERVICE_ROLE_KEY` | Supabase service role key (server-side only) |
| `DATABASE_URL` | Postgres connection string |
| `NEXTAUTH_SECRET` | Random secret for NextAuth (generate with `openssl rand -base64 32`) |
| `NEXTAUTH_URL` | Your app URL (e.g., `https://kznchess.co.za`) |

### 3. Set up the database

Run the SQL files in your Supabase SQL Editor:

1. Run `supabase/schema.sql` to create tables, indexes, and RLS policies
2. Run the migrations in `supabase/migrations/` in order
3. **Production:** run `supabase/seed_districts.sql` to insert the 11 real KZN
   districts (idempotent, no sample data)
4. **Local dev only:** `supabase/seed.sql` populates sample districts, users,
   and tournaments. ⚠️ It **truncates every table** — never run it against
   production.

### 4. Run development server

```bash
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

### Creating the first admin

There are no built-in accounts. Register through the app at `/auth`, then grant
that user admin rights in the database:

```sql
UPDATE users SET role = 'admin' WHERE email = 'you@example.com';
```

All further organizer/admin management happens in the admin panel. Passwords are
stored with bcrypt; never commit real credentials.

## Deployment on Railway

1. Connect your repo to Railway
2. Set all environment variables from `.env.example`
3. Set `NEXTAUTH_URL` to `https://kznchess.co.za`
4. Railway will auto-detect the build config from `railway.toml`
5. Add your custom domain `kznchess.co.za` in Railway settings

The app uses `output: 'standalone'` in Next.js config for optimized container deployment.

## Project Structure

```
src/
  app/
    page.tsx              # Homepage
    about/                # About page
    auth/                 # Login/Register
    submit/               # Submit tournament (organizer+)
    tournaments/          # Tournament browser + detail
    admin/                # Admin CMS (all admin pages)
    api/                  # API routes
  components/
    admin/                # Admin dashboard components
    auth/                 # Auth form
    home/                 # Homepage sections
    layout/               # Navbar, Footer
    providers/            # SessionProvider
    tournaments/          # Tournament cards, browser, detail
    ui/                   # shadcn/ui + custom components
  lib/
    auth.ts               # Auth helpers
    auth-options.ts       # NextAuth config
    supabase/             # Supabase clients
    types.ts              # TypeScript types
    utils.ts              # Utility functions
  middleware.ts           # Route protection
supabase/
  schema.sql              # Database schema
  migrations/             # Incremental migrations (run in order)
  seed_districts.sql      # Production-safe: 11 KZN districts only
  seed.sql                # Local-dev sample data (truncates all tables)
```

## Roles

| Role | Permissions |
|---|---|
| **Player** | Browse and view tournaments |
| **Organizer** | Submit tournaments for approval |
| **Admin** | Full CMS access, manage everything |

## License

Private - KZN Chess
