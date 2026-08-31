import { Pool } from 'pg';
import { envStr } from '@/lib/env';

/**
 * Process-wide connection pool. Next.js on Railway runs as one long-lived
 * Node server, so a single pool is correct; the global stash keeps dev
 * hot-reload from leaking pools.
 */
declare global {
  // eslint-disable-next-line no-var
  var __kznPgPool: Pool | undefined;
}

export function getPool(): Pool {
  if (!global.__kznPgPool) {
    const url = envStr('DATABASE_URL');
    if (!url) throw new Error('DATABASE_URL is not set');
    global.__kznPgPool = new Pool({
      connectionString: url,
      max: 10,
      idleTimeoutMillis: 30_000,
      connectionTimeoutMillis: 10_000,
      ssl: /sslmode=require/.test(url) ? { rejectUnauthorized: false } : undefined,
    });
  }
  return global.__kznPgPool;
}
