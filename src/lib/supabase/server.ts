import { createClient } from '@supabase/supabase-js';

/**
 * Server-side database client (service role — never import in client code).
 *
 * The REST endpoint is either Supabase or a self-hosted PostgREST (Railway).
 * supabase-js prefixes every request with `/rest/v1`, which bare PostgREST
 * does not have, so when SUPABASE_REST_BARE=true the prefix is stripped from
 * each request. Switching between the two is purely an environment change.
 */
const REST_PREFIX = '/rest/v1';
const bare = process.env.SUPABASE_REST_BARE === 'true';

function stripRestPrefix(input: string | URL | Request): string | URL | Request {
  if (typeof input === 'string') return input.replace(REST_PREFIX, '');
  if (input instanceof URL) return new URL(input.toString().replace(REST_PREFIX, ''));
  return input;
}

export function createServerClient() {
  return createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!,
    bare
      ? { global: { fetch: (input, init) => fetch(stripRestPrefix(input), init) } }
      : undefined
  );
}
