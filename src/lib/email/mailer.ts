import nodemailer, { type Transporter } from 'nodemailer';
import { envStr } from '@/lib/env';

/**
 * Outgoing email over SMTP (the KZN Chess mailbox on domains.co.za).
 *
 *   SMTP_HOST  e.g. cp76.domains.co.za (the cPanel server: its TLS certificate
 *              is *.domains.co.za, so mail.<our-domain> fails verification)
 *   SMTP_PORT  465 (implicit TLS, the default) or 587 (STARTTLS)
 *   SMTP_USER  full mailbox address
 *   SMTP_PASS  mailbox password
 *   SMTP_FROM  optional display From, e.g. "KZN Chess <kznchess@flushaway.co.za>";
 *              defaults to SMTP_USER. Must be on the mailbox's own domain.
 */
interface SmtpConfig {
  host: string;
  port: number;
  user: string;
  pass: string;
  from: string;
}

function smtpConfig(): SmtpConfig | null {
  const host = envStr('SMTP_HOST');
  const user = envStr('SMTP_USER');
  const pass = envStr('SMTP_PASS');
  if (!host || !user || !pass) return null;
  const port = Number(envStr('SMTP_PORT') ?? 465);
  return { host, port: Number.isFinite(port) ? port : 465, user, pass, from: envStr('SMTP_FROM') ?? user };
}

let cached: { key: string; transporter: Transporter } | null = null;

function transporterFor(cfg: SmtpConfig): Transporter {
  const key = `${cfg.host}:${cfg.port}:${cfg.user}`;
  if (cached?.key === key) return cached.transporter;
  const transporter = nodemailer.createTransport({
    host: cfg.host,
    port: cfg.port,
    secure: cfg.port === 465,
    requireTLS: cfg.port !== 465,
    auth: { user: cfg.user, pass: cfg.pass },
    connectionTimeout: 15_000,
    greetingTimeout: 15_000,
    socketTimeout: 30_000,
  });
  cached = { key, transporter };
  return transporter;
}

export function isEmailConfigured(): boolean {
  return smtpConfig() !== null;
}

export interface MailMessage {
  to: string[];
  subject: string;
  text: string;
  html?: string;
  replyTo?: string;
}

/** Sends one message. Throws if SMTP is not configured or the server rejects it. */
export async function sendMail(msg: MailMessage): Promise<void> {
  const cfg = smtpConfig();
  if (!cfg) throw new Error('SMTP is not configured (SMTP_HOST, SMTP_USER, SMTP_PASS)');
  if (msg.to.length === 0) throw new Error('sendMail: no recipients');
  await transporterFor(cfg).sendMail({
    from: cfg.from,
    to: msg.to,
    subject: msg.subject,
    text: msg.text,
    html: msg.html,
    replyTo: msg.replyTo,
  });
}
