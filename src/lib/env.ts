/**
 * Environment readers that tolerate how hosting dashboards store values.
 * Railway's raw editor can keep the surrounding quotes from a pasted
 * `KEY="value"` line, so a naive `=== 'true'` check silently fails.
 */
function clean(raw: string | undefined): string {
  return (raw ?? '').trim().replace(/^(['"])([\s\S]*)\1$/, '$2').trim();
}

/** Non-empty string value, or null. */
export function envStr(name: string): string | null {
  const v = clean(process.env[name]);
  return v === '' ? null : v;
}

/** Boolean flag: true / 1 / yes / on (case-insensitive, quote-tolerant). */
export function envFlag(name: string): boolean {
  const v = clean(process.env[name]).toLowerCase();
  return v === 'true' || v === '1' || v === 'yes' || v === 'on';
}
