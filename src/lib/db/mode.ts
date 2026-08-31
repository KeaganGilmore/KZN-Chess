import { envFlag, envStr } from '@/lib/env';

export type DbMode = 'direct' | 'supabase';

/**
 * Which data path this process uses.
 *
 * `DB_DIRECT` turns on direct Postgres explicitly. As a safety net, a
 * deployment that has DATABASE_URL but no usable Supabase configuration also
 * runs direct — otherwise every query would fail against a Supabase project
 * that no longer exists.
 */
export function getDbMode(): DbMode {
  if (envFlag('DB_DIRECT')) return 'direct';
  const hasSupabase = !!envStr('NEXT_PUBLIC_SUPABASE_URL') && !!envStr('SUPABASE_SERVICE_ROLE_KEY');
  if (!hasSupabase && envStr('DATABASE_URL')) return 'direct';
  return 'supabase';
}
