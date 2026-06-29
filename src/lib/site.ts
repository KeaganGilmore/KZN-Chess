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
  process.env.NEXT_PUBLIC_CONTACT_EMAIL || 'info@kznchess.co.za';
