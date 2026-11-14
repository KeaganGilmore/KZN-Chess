import { envStr } from '@/lib/env';
import { sendMail, isEmailConfigured, type MailMessage } from '@/lib/email/mailer';
import { EMAIL_COLORS as C, emailLogo, emailShell, escapeHtml } from '@/lib/email/brand';
import { SITE_URL } from '@/lib/site';
import { formatZar } from './money';
import { ORDER_STATUS_LABELS } from './status';
import type { Order, OrderItem } from './types';

type NotifyLine = Pick<OrderItem, 'product_name' | 'variant_name' | 'quantity' | 'line_total_cents'>;

/** Staff addresses alerted about new orders: ORDER_NOTIFY_EMAILS, comma/semicolon separated. */
export function orderNotifyRecipients(raw = envStr('ORDER_NOTIFY_EMAILS')): string[] {
  if (!raw) return [];
  return [
    ...new Set(
      raw
        .split(/[,;\s]+/)
        .map((s) => s.trim().toLowerCase())
        .filter((s) => /^[^@\s]+@[^@\s.]+(\.[^@\s.]+)+$/.test(s))
    ),
  ];
}

function lineLabel(l: NotifyLine): string {
  return l.variant_name ? `${l.product_name} (${l.variant_name})` : l.product_name;
}

function addressLines(order: Order): string[] {
  if (order.fulfilment === 'collection') return [order.collection_point_name || 'Collection point'];
  const a = order.delivery_address;
  if (!a) return [];
  return [a.line1, a.line2, a.suburb, `${a.city} ${a.postal_code}`.trim(), a.province].filter(
    (s): s is string => !!s && s.trim() !== ''
  );
}

/** "14 Nov 2026, 17:52" in South African time; empty if the date is missing. */
function placedAt(iso: string): string {
  const d = new Date(iso);
  if (!iso || Number.isNaN(d.getTime())) return '';
  return new Intl.DateTimeFormat('en-GB', {
    timeZone: 'Africa/Johannesburg',
    day: 'numeric',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).format(d);
}

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? '' : 's'}`;

/** Staff alert for a newly placed order. Pure, so it can be unit-tested. */
export function buildNewOrderEmail(
  order: Order,
  lines: NotifyLine[],
  opts: { siteUrl: string; paymentLabel: string; withLogo?: boolean }
): Omit<MailMessage, 'to'> {
  const adminUrl = `${opts.siteUrl}/admin/store/orders/${order.id}`;
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const when = placedAt(order.created_at);
  const status = ORDER_STATUS_LABELS[order.status] ?? order.status;
  const isDelivery = order.fulfilment === 'delivery';
  const subject = `New order ${order.order_number}: ${formatZar(order.total_cents)} from ${order.customer_name}`;

  const totals: [string, string][] = [['Subtotal', formatZar(order.subtotal_cents)]];
  if (isDelivery) totals.push(['Delivery', formatZar(order.delivery_fee_cents)]);
  totals.push(['Total', formatZar(order.total_cents)]);

  // ---------- plain text ----------
  const text = [
    `NEW ORDER ${order.order_number}`,
    `${formatZar(order.total_cents)} · ${plural(itemCount, 'item')} · ${opts.paymentLabel} (${status})${when ? ` · ${when}` : ''}`,
    '',
    'ITEMS',
    ...lines.map((l) => `- ${l.quantity} x ${lineLabel(l)}: ${formatZar(l.line_total_cents)}`),
    '',
    ...totals.map(([k, v]) => `${k}: ${v}`),
    '',
    'CUSTOMER',
    order.customer_name,
    order.customer_email,
    order.customer_phone,
    '',
    isDelivery ? 'DELIVERY TO' : 'COLLECTION',
    ...(isDelivery && addressLines(order).length === 0 ? ['Delivery'] : addressLines(order)),
    ...(order.customer_note ? ['', 'CUSTOMER NOTE', order.customer_note] : []),
    '',
    `View order: ${adminUrl}`,
    'Reply to this email to contact the customer.',
  ].join('\n');

  // ---------- HTML ----------
  const e = escapeHtml;
  const label = (s: string) =>
    `<div style="font-size:11px;font-weight:600;letter-spacing:0.12em;text-transform:uppercase;color:${C.muted};padding-bottom:8px;">${s}</div>`;
  const pad = 'padding-left:32px;padding-right:32px;';

  const itemRows = lines
    .map(
      (l) => `<tr>
  <td style="padding:12px 0;border-bottom:1px solid ${C.hairline};font-size:14px;line-height:1.45;color:${C.ink};">
    ${e(l.product_name)}${l.variant_name ? `<div style="font-size:12px;color:${C.muted};padding-top:2px;">${e(l.variant_name)}</div>` : ''}
  </td>
  <td style="padding:12px 8px;border-bottom:1px solid ${C.hairline};font-size:14px;color:${C.body};text-align:center;white-space:nowrap;" width="48">${l.quantity}</td>
  <td style="padding:12px 0;border-bottom:1px solid ${C.hairline};font-size:14px;color:${C.ink};text-align:right;white-space:nowrap;" width="96">${e(formatZar(l.line_total_cents))}</td>
</tr>`
    )
    .join('');

  const totalRows = totals
    .map(([k, v], i) => {
      const last = i === totals.length - 1;
      const style = last
        ? `padding:14px 0 0;font-size:16px;font-weight:700;color:${C.ink};`
        : `padding:10px 0 0;font-size:13px;color:${C.muted};`;
      return `<tr><td colspan="2" style="${style}text-align:right;">${k}</td><td style="${style}text-align:right;white-space:nowrap;" width="96">${e(v)}</td></tr>`;
    })
    .join('');

  const infoColumn = (title: string, inner: string) =>
    `<div style="display:inline-block;vertical-align:top;width:100%;max-width:256px;padding:0 0 20px;">${label(title)}<div style="font-size:14px;line-height:1.6;color:${C.ink};">${inner}</div></div>`;

  const customerInfo = [
    `<strong style="font-weight:600;">${e(order.customer_name)}</strong>`,
    `<a href="mailto:${e(order.customer_email)}" style="color:${C.ink};text-decoration:underline;text-decoration-color:${C.hairline};">${e(order.customer_email)}</a>`,
    `<a href="tel:${e(order.customer_phone.replace(/[^\d+]/g, ''))}" style="color:${C.ink};text-decoration:none;">${e(order.customer_phone)}</a>`,
  ].join('<br>');

  const fulfilmentInfo = addressLines(order).map(e).join('<br>') || 'Delivery';

  const body = `
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
  <tr><td class="px" style="${pad}padding-top:30px;padding-bottom:26px;">
    <div style="font-size:11px;font-weight:700;letter-spacing:0.16em;text-transform:uppercase;color:${C.ochre};padding-bottom:10px;">New order received</div>
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0"><tr>
      <td class="stack" style="vertical-align:bottom;">
        <div class="hero-num" style="font-size:26px;line-height:1.2;font-weight:700;color:${C.ink};letter-spacing:-0.01em;">${e(order.order_number)}</div>
        <div style="font-size:13px;color:${C.muted};padding-top:6px;">${e(order.customer_name)} &middot; ${plural(itemCount, 'item')}${when ? ` &middot; ${e(when)}` : ''}</div>
      </td>
      <td class="stack stack-gap" style="vertical-align:bottom;text-align:right;padding-left:16px;">
        <div class="hero-num" style="font-size:26px;white-space:nowrap;line-height:1.2;font-weight:700;color:${C.ink};">${e(formatZar(order.total_cents))}</div>
        <div style="padding-top:6px;"><span style="display:inline-block;font-size:11px;font-weight:600;color:${C.ink};background:${C.panel};border:1px solid ${C.hairline};border-radius:999px;padding:3px 10px;">${e(opts.paymentLabel)} &middot; ${e(status)}</span></div>
      </td>
    </tr></table>
  </td></tr>

  <tr><td class="px" style="${pad}"><div style="height:1px;background:${C.hairline};line-height:1px;font-size:1px;">&nbsp;</div></td></tr>

  <tr><td class="px" style="${pad}padding-top:24px;padding-bottom:28px;">
    ${label('Items')}
    <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
      ${itemRows}
      ${totalRows}
    </table>
  </td></tr>

  <tr><td class="px" style="background:${C.panel};border-top:1px solid ${C.hairline};border-bottom:1px solid ${C.hairline};${pad}padding-top:24px;padding-bottom:4px;">
    ${infoColumn('Customer', customerInfo)}${infoColumn(isDelivery ? 'Deliver to' : 'Collection', fulfilmentInfo)}
  </td></tr>

  ${
    order.customer_note
      ? `<tr><td class="px" style="${pad}padding-top:24px;">
    ${label('Customer note')}
    <div style="border-left:3px solid ${C.ochre};padding:2px 0 2px 14px;font-size:14px;line-height:1.6;color:${C.ink};white-space:pre-wrap;">${e(order.customer_note)}</div>
  </td></tr>`
      : ''
  }

  <tr><td class="px" style="${pad}padding-top:28px;padding-bottom:32px;">
    <table role="presentation" cellpadding="0" cellspacing="0" border="0"><tr>
      <td style="border-radius:6px;background:${C.ink};">
        <a href="${e(adminUrl)}" style="display:inline-block;padding:13px 22px;font-size:14px;font-weight:600;color:#ffffff;text-decoration:none;border-radius:6px;">View order in admin &rarr;</a>
      </td>
    </tr></table>
    <div style="font-size:12px;color:${C.muted};padding-top:14px;">Reply to this email to contact ${e(order.customer_name)} directly.</div>
  </td></tr>
</table>`;

  const html = emailShell({
    preheader: `${formatZar(order.total_cents)} from ${order.customer_name}, ${plural(itemCount, 'item')}, ${isDelivery ? 'delivery' : 'collection'}`,
    eyebrow: 'Store · Order alert',
    body,
    footer: `You're receiving this because you're on the KZN Chess store order alert list.<br><a href="${e(opts.siteUrl)}" style="color:${C.muted};">${e(opts.siteUrl.replace(/^https?:\/\//, ''))}</a>`,
    withLogo: opts.withLogo ?? false,
  });

  return { subject, text, html, replyTo: order.customer_email };
}

/**
 * Emails staff about a new order. Never throws: a mail failure must not fail
 * the checkout that already committed the order, so it is logged instead.
 */
export async function notifyNewOrder(
  order: Order,
  lines: NotifyLine[],
  paymentLabel: string
): Promise<void> {
  const to = orderNotifyRecipients();
  if (to.length === 0 || !isEmailConfigured()) {
    console.warn(
      `Order ${order.order_number}: staff email not sent (set ORDER_NOTIFY_EMAILS and SMTP_HOST/SMTP_USER/SMTP_PASS)`
    );
    return;
  }
  try {
    const logo = await emailLogo();
    const info = await sendMail({
      to,
      ...buildNewOrderEmail(order, lines, { siteUrl: SITE_URL, paymentLabel, withLogo: !!logo }),
      attachments: logo ? [logo] : undefined,
    });
    console.log(
      `Order ${order.order_number}: staff email sent to ${to.join(', ')} (server: ${info.response})`
    );
  } catch (err) {
    console.error(
      `Order ${order.order_number}: staff email failed (user ${envStr('SMTP_USER')} @ ${envStr('SMTP_HOST')}):`,
      err instanceof Error ? err.message : err
    );
  }
}
