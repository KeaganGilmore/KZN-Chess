#!/bin/bash
# Seed script - runs seed.sql against DATABASE_URL
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set"
  echo "Usage: DATABASE_URL=postgres://... npm run db:seed"
  exit 1
fi

echo "🌱 Seeding database..."
psql "$DATABASE_URL" -f supabase/seed.sql
echo "✅ Seed complete"
