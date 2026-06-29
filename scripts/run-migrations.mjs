#!/usr/bin/env node
/**
 * Apply SQL migration files via a direct Postgres connection (DATABASE_URL).
 * Migrations are written to be idempotent, so re-running is safe.
 *
 *   node scripts/run-migrations.mjs                 # all files in supabase/migrations
 *   node scripts/run-migrations.mjs 003_puzzles.sql 004_puzzle_progress.sql
 */
import { readFileSync, existsSync, readdirSync } from 'node:fs';
import { dirname, join, basename, isAbsolute } from 'node:path';
import { fileURLToPath } from 'node:url';
import pg from 'pg';

const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
function loadEnv(p) {
  if (!existsSync(p)) return;
  for (const line of readFileSync(p, 'utf8').split('\n')) {
    const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
    if (!m || process.env[m[1]] !== undefined) continue;
    process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
  }
}
loadEnv(join(repoRoot, '.env.local'));
loadEnv(join(repoRoot, '.env'));

const url = process.env.DATABASE_URL;
if (!url) {
  console.error('Missing DATABASE_URL');
  process.exit(1);
}

const migDir = join(repoRoot, 'supabase', 'migrations');
const args = process.argv.slice(2);
const files = args.length
  ? args.map((a) => (isAbsolute(a) || a.includes('/') || a.includes('\\') ? a : join(migDir, a)))
  : readdirSync(migDir).filter((f) => f.endsWith('.sql')).sort().map((f) => join(migDir, f));

const client = new pg.Client({ connectionString: url, ssl: { rejectUnauthorized: false } });
await client.connect();
console.log('connected to database.');

for (const f of files) {
  if (!existsSync(f)) {
    console.error(`  missing: ${f}`);
    await client.end();
    process.exit(1);
  }
  process.stdout.write(`applying ${basename(f)} ... `);
  try {
    await client.query(readFileSync(f, 'utf8'));
    console.log('ok');
  } catch (e) {
    console.log('FAILED');
    console.error(`  ${e.message}`);
    await client.end();
    process.exit(1);
  }
}

await client.end();
console.log('done.');
