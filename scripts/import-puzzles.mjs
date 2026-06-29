#!/usr/bin/env node
/**
 * Lichess puzzle database importer.
 *
 * Streams the public Lichess puzzle CSV and upserts it into the `puzzles`
 * table in batches. Designed for the full ~5M-row dump without loading it all
 * into memory.
 *
 * Get the data (≈300 MB compressed, ≈1 GB CSV):
 *   curl -O https://database.lichess.org/lichess_db_puzzle.csv.zst
 *
 * Run (accepts the .zst directly if `zstd` is installed, or a plain .csv):
 *   node scripts/import-puzzles.mjs lichess_db_puzzle.csv.zst
 *   node scripts/import-puzzles.mjs lichess_db_puzzle.csv --batch 2000
 *
 * Options:
 *   --limit N        stop after N imported rows (handy for a test run)
 *   --batch N        rows per upsert (default 1000)
 *   --min-rating N   only import puzzles rated >= N
 *   --max-rating N   only import puzzles rated <= N
 *
 * Requires NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY (env or
 * .env.local / .env at the repo root). Idempotent: upserts on the puzzle id.
 */

import { createReadStream, readFileSync, existsSync } from 'node:fs';
import { dirname, join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { createInterface } from 'node:readline';
import { spawn } from 'node:child_process';

/** Parse one Lichess puzzle CSV line into a DB row, or null to skip it. */
export function parsePuzzleRow(line) {
  if (!line) return null;
  const p = line.split(',');
  if (p.length < 10) return null;
  if (p[0] === 'PuzzleId') return null; // header row
  const [id, fen, moves, rating, ratingDeviation, popularity, nbPlays, themes, gameUrl, openingTags] = p;
  const rt = parseInt(rating, 10);
  if (!id || !fen || !moves || Number.isNaN(rt)) return null;
  const splitTags = (s) => (s ? s.trim().split(/\s+/).filter(Boolean) : []);
  const toInt = (s) => {
    const n = parseInt(s, 10);
    return Number.isNaN(n) ? null : n;
  };
  return {
    id,
    fen,
    moves,
    rating: rt,
    rating_deviation: toInt(ratingDeviation),
    popularity: toInt(popularity),
    nb_plays: toInt(nbPlays),
    themes: splitTags(themes),
    game_url: gameUrl || null,
    opening_tags: splitTags(openingTags),
  };
}

function parseArgs(argv) {
  const opts = { file: null, limit: Infinity, batch: 1000, minRating: -Infinity, maxRating: Infinity };
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i];
    if (a === '--limit') opts.limit = parseInt(argv[++i], 10);
    else if (a === '--batch') opts.batch = parseInt(argv[++i], 10);
    else if (a === '--min-rating') opts.minRating = parseInt(argv[++i], 10);
    else if (a === '--max-rating') opts.maxRating = parseInt(argv[++i], 10);
    else if (!a.startsWith('--')) opts.file = a;
  }
  return opts;
}

function loadEnv(repoRoot) {
  for (const f of ['.env.local', '.env']) {
    const path = join(repoRoot, f);
    if (!existsSync(path)) continue;
    for (const line of readFileSync(path, 'utf8').split('\n')) {
      const m = line.match(/^\s*([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)\s*$/);
      if (!m || process.env[m[1]] !== undefined) continue;
      process.env[m[1]] = m[2].replace(/^["']|["']$/g, '');
    }
  }
}

/** Returns a readable stream of CSV text, decompressing .zst on the fly. */
function openInput(file) {
  if (file.endsWith('.zst')) {
    const child = spawn('zstd', ['-dc', file], { stdio: ['ignore', 'pipe', 'inherit'] });
    child.on('error', (e) => {
      console.error(`Failed to spawn zstd (${e.message}). Install zstd or decompress to .csv first.`);
      process.exit(1);
    });
    return child.stdout;
  }
  return createReadStream(file);
}

async function main() {
  const repoRoot = join(dirname(fileURLToPath(import.meta.url)), '..');
  loadEnv(repoRoot);
  const { createClient } = await import('@supabase/supabase-js');

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    console.error('Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY.');
    process.exit(1);
  }
  const opts = parseArgs(process.argv.slice(2));
  if (!opts.file) {
    console.error('Usage: node scripts/import-puzzles.mjs <lichess_db_puzzle.csv[.zst]> [options]');
    process.exit(1);
  }
  if (!existsSync(opts.file)) {
    console.error(`File not found: ${opts.file}`);
    process.exit(1);
  }

  const supabase = createClient(url, key);
  const rl = createInterface({ input: openInput(opts.file), crlfDelay: Infinity });

  let batch = [];
  let imported = 0;
  let scanned = 0;

  const flush = async () => {
    if (batch.length === 0) return;
    const { error } = await supabase.from('puzzles').upsert(batch, { onConflict: 'id' });
    if (error) {
      console.error(`\nUpsert failed at ${imported} rows: ${error.message}`);
      process.exit(1);
    }
    imported += batch.length;
    batch = [];
    process.stdout.write(`\rimported ${imported} (scanned ${scanned})`);
  };

  for await (const line of rl) {
    scanned++;
    const row = parsePuzzleRow(line);
    if (!row) continue;
    if (row.rating < opts.minRating || row.rating > opts.maxRating) continue;
    batch.push(row);
    if (batch.length >= opts.batch) {
      await flush(); // awaiting here applies backpressure to the stream
      if (imported >= opts.limit) break;
    }
  }
  await flush();

  console.log(`\nDone. Imported ${imported} puzzles (scanned ${scanned} lines).`);
  process.exit(0);
}

const invokedDirectly =
  process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url);
if (invokedDirectly) {
  main().catch((e) => {
    console.error(e);
    process.exit(1);
  });
}
