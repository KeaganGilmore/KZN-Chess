import { readFile } from 'fs/promises';
import path from 'path';
import type { MailAttachment } from './mailer';

/**
 * Shared look for KZN Chess emails: the logo (embedded, so it shows even when
 * a mail app blocks remote images) and a table-based layout with inline
 * styles, which is what Gmail, Outlook and Apple Mail all render reliably.
 */

export const LOGO_CID = 'kznchess-logo';

/** Brand colours from the logo / site theme. */
export const EMAIL_COLORS = {
  ink: '#111418',
  body: '#3a3f47',
  muted: '#6b7280',
  hairline: '#e7e5e1',
  canvas: '#f3f2ef',
  panel: '#faf9f7',
  ochre: '#d9962f',
  green: '#2e7d3a',
} as const;

export const EMAIL_FONT =
  "-apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif";

let logoCache: Buffer | null | undefined;

/**
 * public/email-logo.png (a 164x192 copy of public/logo.png). The standalone
 * server chdirs to .next/standalone, where the build copies public/, so
 * cwd/public works in dev and production. Missing → null (email still sends).
 */
export async function emailLogo(): Promise<MailAttachment | null> {
  if (logoCache === undefined) {
    try {
      logoCache = await readFile(path.join(process.cwd(), 'public', 'email-logo.png'));
    } catch (err) {
      console.warn('Email logo not found; sending without it:', err instanceof Error ? err.message : err);
      logoCache = null;
    }
  }
  return logoCache
    ? { filename: 'kznchess-logo.png', content: logoCache, contentType: 'image/png', cid: LOGO_CID }
    : null;
}

export function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

/**
 * Wraps body rows in the branded shell: logo header, white card, footer.
 * `preheader` is the grey preview line inbox lists show after the subject.
 */
export function emailShell(opts: {
  preheader: string;
  eyebrow: string;
  body: string;
  footer: string;
  withLogo: boolean;
}): string {
  const c = EMAIL_COLORS;
  const logo = opts.withLogo
    ? `<img src="cid:${LOGO_CID}" width="41" height="48" alt="KZN Chess" style="display:block;border:0;outline:none;width:41px;height:48px">`
    : '';
  return `<!doctype html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<meta name="color-scheme" content="light only">
<meta name="supported-color-schemes" content="light">
<title>KZN Chess</title>
<style>
  @media only screen and (max-width: 520px) {
    .px { padding-left: 20px !important; padding-right: 20px !important; }
    .stack { display: block !important; width: 100% !important; text-align: left !important; padding-left: 0 !important; }
    .stack-gap { padding-top: 14px !important; }
    .hero-num { font-size: 22px !important; }
  }
</style>
</head>
<body style="margin:0;padding:0;background:${c.canvas};-webkit-text-size-adjust:100%;">
<div style="display:none;max-height:0;overflow:hidden;opacity:0;color:transparent;">${escapeHtml(opts.preheader)}</div>
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background:${c.canvas};">
<tr><td align="center" style="padding:32px 12px;">
  <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:100%;max-width:600px;">
    <tr><td style="padding:0 4px 18px;">
      <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
        ${logo ? `<td style="padding-right:12px;vertical-align:middle;">${logo}</td>` : ''}
        <td style="vertical-align:middle;font-family:${EMAIL_FONT};">
          <div style="font-size:15px;font-weight:700;letter-spacing:0.14em;color:${c.ink};text-transform:uppercase;">KZN Chess</div>
          <div style="font-size:12px;color:${c.muted};letter-spacing:0.04em;padding-top:2px;">${escapeHtml(opts.eyebrow)}</div>
        </td>
      </tr></table>
    </td></tr>
    <tr><td style="background:#ffffff;border:1px solid ${c.hairline};border-top:3px solid ${c.ochre};border-radius:10px;font-family:${EMAIL_FONT};color:${c.body};">
      ${opts.body}
    </td></tr>
    <tr><td style="padding:18px 8px 0;font-family:${EMAIL_FONT};font-size:12px;line-height:1.6;color:${c.muted};text-align:center;">
      ${opts.footer}
    </td></tr>
  </table>
</td></tr>
</table>
</body>
</html>`;
}
