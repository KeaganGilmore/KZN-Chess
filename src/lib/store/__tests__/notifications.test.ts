import { describe, it, expect } from 'vitest';
import { buildNewOrderEmail, orderNotifyRecipients } from '@/lib/store/notifications';
import type { Order } from '@/lib/store/types';

const order: Order = {
  id: 'o1',
  order_number: 'KZN-000042',
  access_token: 'tok',
  user_id: null,
  customer_name: 'Jane <Player>',
  customer_email: 'jane@example.com',
  customer_phone: '082 123 4567',
  fulfilment: 'delivery',
  delivery_address: {
    line1: '1 Main Rd',
    line2: null,
    suburb: 'Umhlanga',
    city: 'Durban',
    postal_code: '4320',
    province: 'KwaZulu-Natal',
  },
  collection_point_id: null,
  collection_point_name: null,
  subtotal_cents: 45000,
  delivery_fee_cents: 9900,
  total_cents: 54900,
  status: 'awaiting_payment',
  payment_provider: 'manual_eft',
  payment_reference: null,
  payment_status: 'pending',
  paid_at: null,
  customer_note: 'Leave at gate',
  admin_note: null,
  terms_version: null,
  terms_accepted_at: null,
  created_at: '',
  updated_at: '',
};

const lines = [
  { product_name: 'Club Set', variant_name: 'Black', quantity: 2, line_total_cents: 30000 },
  { product_name: 'Clock', variant_name: null, quantity: 1, line_total_cents: 15000 },
];

describe('orderNotifyRecipients', () => {
  it('splits, lowercases, dedupes and drops invalid entries', () => {
    expect(orderNotifyRecipients(' A@x.com, b@y.co.za;a@X.com  nope ')).toEqual(['a@x.com', 'b@y.co.za']);
    expect(orderNotifyRecipients(null)).toEqual([]);
  });
});

describe('buildNewOrderEmail', () => {
  const mail = buildNewOrderEmail(order, lines, { siteUrl: 'https://kznchess.co.za', paymentLabel: 'EFT' });

  it('summarises the order in the subject', () => {
    expect(mail.subject).toBe('New order KZN-000042: R549.00 from Jane <Player>');
  });

  it('lists items, totals, customer, address and admin link in the text body', () => {
    expect(mail.text).toContain('- 2 x Club Set (Black): R300.00');
    expect(mail.text).toContain('- 1 x Clock: R150.00');
    expect(mail.text).toContain('Delivery: R99.00');
    expect(mail.text).toContain('Total: R549.00');
    expect(mail.text).toContain('Umhlanga');
    expect(mail.text).toContain('Leave at gate');
    expect(mail.text).toContain('https://kznchess.co.za/admin/store/orders/o1');
  });

  it('escapes customer input in the HTML body and replies to the customer', () => {
    expect(mail.html).toContain('Jane &lt;Player&gt;');
    expect(mail.html).not.toContain('Jane <Player>');
    expect(mail.replyTo).toBe('jane@example.com');
  });

  it('omits the delivery fee row for collection orders', () => {
    const c = buildNewOrderEmail(
      { ...order, fulfilment: 'collection', delivery_address: null, collection_point_name: 'Durban Chess Club', delivery_fee_cents: 0 },
      lines,
      { siteUrl: 'https://kznchess.co.za', paymentLabel: 'EFT' }
    );
    expect(c.text).not.toContain('Delivery:');
    expect(c.text).toContain('COLLECTION\nDurban Chess Club');
  });

  it('references the embedded logo only when it is attached', () => {
    const opts = { siteUrl: 'https://kznchess.co.za', paymentLabel: 'EFT' };
    expect(buildNewOrderEmail(order, lines, { ...opts, withLogo: true }).html).toContain('src="cid:kznchess-logo"');
    expect(buildNewOrderEmail(order, lines, opts).html).not.toContain('cid:');
  });
});
