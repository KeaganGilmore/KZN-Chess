#!/usr/bin/env node
/**
 * Mint the API keys for a self-hosted PostgREST (Railway) deployment.
 *
 * A "Supabase key" is just an HS256 JWT whose `role` claim names a Postgres
 * role. PostgREST verifies it with PGRST_JWT_SECRET and runs the request as
 * that role. We only issue a service_role key (BYPASSRLS, server-side only);
 * the browser never talks to the database API.
 *
 *   node scripts/mint-postgrest-keys.mjs            # generates a fresh secret
 *   node scripts/mint-postgrest-keys.mjs <secret>   # reuse an existing secret
 */
import { createHmac, randomBytes } from 'node:crypto';

const b64url = (input) =>
  Buffer.from(input).toString('base64').replace(/=+$/, '').replace(/\+/g, '-').replace(/\//g, '_');

function sign(payload, secret) {
  const header = b64url(JSON.stringify({ alg: 'HS256', typ: 'JWT' }));
  const body = b64url(JSON.stringify(payload));
  const sig = createHmac('sha256', secret).update(`${header}.${body}`).digest();
  return `${header}.${body}.${b64url(sig)}`;
}

const secret = process.argv[2] || randomBytes(48).toString('base64url');
if (secret.length < 32) {
  console.error('PGRST_JWT_SECRET must be at least 32 characters');
  process.exit(1);
}
const iat = Math.floor(Date.now() / 1000);
const exp = iat + 10 * 365 * 24 * 60 * 60; // 10 years

const serviceKey = sign({ role: 'service_role', iss: 'kznchess', iat, exp }, secret);
const anonKey = sign({ role: 'anon', iss: 'kznchess', iat, exp }, secret);

console.log(`PGRST_JWT_SECRET=${secret}`);
console.log(`SUPABASE_SERVICE_ROLE_KEY=${serviceKey}`);
console.log(`NEXT_PUBLIC_SUPABASE_ANON_KEY=${anonKey}`);
