/**
 * Canonical public site URL, used for share links, Open Graph, and canonical
 * metadata. Set NEXT_PUBLIC_SITE_URL in each environment; falls back to the
 * production domain. Trailing slash is stripped so callers can append paths.
 */
export const SITE_URL = (
  process.env.NEXT_PUBLIC_SITE_URL || 'https://kznchess.co.za'
).replace(/\/$/, '');

/** Public contact email, overridable per-environment. */
export const CONTACT_EMAIL =
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'keagangilmore@gmail.com';

/** Site name, used consistently across metadata, JSON-LD and OG tags. */
export const SITE_NAME = 'KZN Chess';

/** Default site description, used as a fallback wherever a page has none of its own. */
export const SITE_DESCRIPTION =
  'The central hub for all chess tournaments across KwaZulu-Natal, South Africa. Find events, register, and grow the chess community.';
