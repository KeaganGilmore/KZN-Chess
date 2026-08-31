import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createDirectClient } from '@/lib/db';
import { getDbMode } from '@/lib/db/mode';

/**
 * Server-side database client (never import in client components).
 *
 * Direct mode (production on Railway): queries run as SQL over a pg pool
 * against DATABASE_URL on the private network — no Supabase, no API layer.
 * src/lib/db implements the query-builder surface this codebase uses, so
 * call sites are identical in both modes; the cast keeps their types.
 *
 * Supabase mode: the original hosted client (legacy / local dev).
 */
let logged = false;

export function createServerClient(): SupabaseClient {
  const mode = getDbMode();
  if (!logged) {
    logged = true;
    console.log(`[db] mode=${mode}`);
  }
  if (mode === 'direct') {
    return createDirectClient() as unknown as SupabaseClient;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
