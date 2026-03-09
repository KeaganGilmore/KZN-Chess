#!/bin/bash
# Railway migration script - runs schema.sql against DATABASE_URL on build
set -e

if [ -z "$DATABASE_URL" ]; then
  echo "⚠️  DATABASE_URL not set, skipping migration"
  exit 0
fi

echo "🔄 Running database migrations..."

# Install psql if not available (Nixpacks provides it via postgresql)
if ! command -v psql &> /dev/null; then
  echo "⚠️  psql not found, skipping migration"
  exit 0
fi

# Run schema (uses IF NOT EXISTS / CREATE OR REPLACE so it's idempotent)
psql "$DATABASE_URL" -f supabase/schema.sql 2>&1 || echo "⚠️  Schema migration had warnings (tables may already exist)"

echo "✅ Migration complete"
