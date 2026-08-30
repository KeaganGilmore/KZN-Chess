import { createClient, type SupabaseClient } from '@supabase/supabase-js';
import { createDirectClient } from '@/lib/db';

/**
 * Server-side database client (never import in client components).
 *
 * DB_DIRECT=true (production on Railway): queries run as SQL over a pg pool
 * against DATABASE_URL on the private network — no Supabase, no PostgREST
 * service. src/lib/db implements the query-builder surface this codebase
 * uses, so call sites are identical in both modes; the cast below keeps the
 * original compile-time types at every call site.
 *
 * Otherwise: the original hosted-Supabase client (legacy / local dev).
 */
export function createServerClient(): SupabaseClient {
  if (process.env.DB_DIRECT === 'true') {
    return createDirectClient() as unknown as SupabaseClient;
  }
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );
}
