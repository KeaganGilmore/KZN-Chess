import { envStr } from '@/lib/env';
import { sendMail, isEmailConfigured, type MailMessage } from '@/lib/email/mailer';
import { SITE_URL } from '@/lib/site';
import { formatZar } from './money';
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
        .filter((s) => /^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(s))
    ),
  ];
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function lineLabel(l: NotifyLine): string {
  return `${l.product_name}${l.variant_name ? ` (${l.variant_name})` : ''}`;
}

function fulfilmentLines(order: Order): string[] {
  if (order.fulfilment === 'collection') {
    return [`Collection at ${order.collection_point_name || 'collection point'}`];
  }
  const a = order.delivery_address;
  if (!a) return ['Delivery'];
  return [
    'Delivery to:',
    a.line1,
    a.line2,
    a.suburb,
    `${a.city} ${a.postal_code}`.trim(),
    a.province,
  ].filter((s): s is string => !!s && s.trim() !== '');
}

/** Staff alert for a newly placed order. Pure, so it can be unit-tested. */
export function buildNewOrderEmail(
  order: Order,
  lines: NotifyLine[],
  opts: { siteUrl: string; paymentLabel: string }
): Omit<MailMessage, 'to'> {
  const adminUrl = `${opts.siteUrl}/admin/store/orders/${order.id}`;
  const itemCount = lines.reduce((n, l) => n + l.quantity, 0);
  const subject = `New order ${order.order_number}: ${formatZar(order.total_cents)} from ${order.customer_name}`;

  const totals: [string, string][] = [['Subtotal', formatZar(order.subtotal_cents)]];
  if (order.fulfilment === 'delivery') {
    totals.push(['Delivery', formatZar(order.delivery_fee_cents)]);
  }
  totals.push(['Total', formatZar(order.total_cents)]);

  const text = [
    `New order ${order.order_number} (${itemCount} item${itemCount === 1 ? '' : 's'})`,
    '',
    ...lines.map((l) => `- ${l.quantity} x ${lineLabel(l)}: ${formatZar(l.line_total_cents)}`),
    '',
    ...totals.map(([k, v]) => `${k}: ${v}`),
    `Payment: ${opts.paymentLabel}`,
    '',
    'Customer:',
    order.customer_name,
    order.customer_email,
    order.customer_phone,
    '',
    ...fulfilmentLines(order),
    ...(order.customer_note ? ['', 'Customer note:', order.customer_note] : []),
    '',
    `Manage this order: ${adminUrl}`,
  ].join('\n');

  const td = 'padding:6px 8px;border-bottom:1px solid #e5e5e5;';
  const html = `<!doctype html><html><body style="font-family:Arial,Helvetica,sans-serif;color:#1a1a1a;font-size:14px;line-height:1.5">
<h2 style="margin:0 0 4px">New order ${escapeHtml(order.order_number)}</h2>
<p style="margin:0 0 16px;color:#555">${itemCount} item${itemCount === 1 ? '' : 's'} · ${escapeHtml(formatZar(order.total_cents))} · ${escapeHtml(opts.paymentLabel)}</p>
<table cellpadding="0" cellspacing="0" style="border-collapse:collapse;width:100%;max-width:560px">
${lines
  .map(
    (l) =>
      `<tr><td style="${td}">${l.quantity} &times; ${escapeHtml(lineLabel(l))}</td><td style="${td}text-align:right;white-space:nowrap">${escapeHtml(formatZar(l.line_total_cents))}</td></tr>`
  )
  .join('\n')}
${totals
  .map(
    ([k, v], i) =>
      `<tr><td style="padding:6px 8px;text-align:right;${i === totals.length - 1 ? 'font-weight:bold' : 'color:#555'}">${k}</td><td style="padding:6px 8px;text-align:right;white-space:nowrap;${i === totals.length - 1 ? 'font-weight:bold' : ''}">${escapeHtml(v)}</td></tr>`
  )
  .join('\n')}
</table>
<h3 style="margin:20px 0 4px">Customer</h3>
<p style="margin:0">${escapeHtml(order.customer_name)}<br>
<a href="mailto:${escapeHtml(order.customer_email)}">${escapeHtml(order.customer_email)}</a><br>
<a href="tel:${escapeHtml(order.customer_phone.replace(/[^\d+]/g, ''))}">${escapeHtml(order.customer_phone)}</a></p>
<h3 style="margin:20px 0 4px">${order.fulfilment === 'delivery' ? 'Delivery' : 'Collection'}</h3>
<p style="margin:0">${fulfilmentLines(order)
    .slice(order.fulfilment === 'delivery' && order.delivery_address ? 1 : 0)
    .map(escapeHtml)
    .join('<br>')}</p>
${order.customer_note ? `<h3 style="margin:20px 0 4px">Customer note</h3><p style="margin:0;white-space:pre-wrap">${escapeHtml(order.customer_note)}</p>` : ''}
<p style="margin:24px 0"><a href="${escapeHtml(adminUrl)}" style="background:#0f766e;color:#fff;padding:10px 16px;border-radius:6px;text-decoration:none;display:inline-block">Open order in admin</a></p>
</body></html>`;

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
    const info = await sendMail({
      to,
      ...buildNewOrderEmail(order, lines, { siteUrl: SITE_URL, paymentLabel }),
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
