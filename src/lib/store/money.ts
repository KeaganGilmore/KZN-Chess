/**
 * Money helpers. Amounts are integer cents (ZAR). Formatting is deterministic
 * (no Intl) so server and client render identical strings — Intl's en-ZA
 * output differs between Node ICU and browsers and causes hydration errors.
 */
export function formatZar(cents: number): string {
  const sign = cents < 0 ? '-' : '';
  const abs = Math.abs(Math.round(cents));
  const rand = Math.floor(abs / 100)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ');
  const c = String(abs % 100).padStart(2, '0');
  return `${sign}R${rand}.${c}`;
}

/**
 * Parse a rand amount typed by an admin to cents. Accepts "R1 234.50",
 * "1,234.5", 450, and the South African decimal comma ("12,50" → R12.50):
 * a comma followed by one or two digits at the end is a decimal separator,
 * any other comma is a thousands separator.
 */
export function randsToCents(input: string | number): number | null {
  let n: number;
  if (typeof input === 'number') {
    n = input;
  } else {
    let s = String(input).replace(/[R\s]/g, '');
    if (/^\d+,\d{1,2}$/.test(s)) s = s.replace(',', '.');
    else s = s.replace(/,/g, '');
    if (!/^\d*\.?\d*$/.test(s) || s === '' || s === '.') return null;
    n = parseFloat(s);
  }
  if (!Number.isFinite(n) || n < 0) return null;
  return Math.round(n * 100);
}
