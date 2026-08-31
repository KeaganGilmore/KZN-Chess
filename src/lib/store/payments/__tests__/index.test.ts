import { describe, it, expect } from 'vitest';
import { getPaymentProvider, providerOptions } from '@/lib/store/payments';
import { manualEft } from '@/lib/store/payments/manual-eft';
import { contactOnly } from '@/lib/store/payments/contact';
import type { Order, StoreSettings } from '@/lib/store/types';

const baseSettings: StoreSettings = {
  id: 1,
  store_enabled: true,
  payment_enabled: true,
  delivery_enabled: true,
  collection_enabled: true,
  delivery_fee_cents: 0,
  free_delivery_threshold_cents: null,
  bank_details: 'Bank: Test\nAccount: 123',
  whatsapp_number: null,
  store_name: 'KZN Chess Store',
  tagline: null,
  updated_at: '',
};

const baseOrder: Order = {
  id: 'o1',
  order_number: 'KZN-000001',
  access_token: 'tok',
  user_id: null,
  customer_name: 'Jane Player',
  customer_email: 'jane@example.com',
  customer_phone: '0821234567',
  fulfilment: 'collection',
  delivery_address: null,
  collection_point_id: null,
  collection_point_name: 'Durban Chess Club',
  subtotal_cents: 20000,
  delivery_fee_cents: 0,
  total_cents: 20000,
  status: 'awaiting_payment',
  payment_provider: 'manual_eft',
  payment_reference: null,
  payment_status: 'pending',
  paid_at: null,
  customer_note: null,
  admin_note: null,
  created_at: '',
  updated_at: '',
};

describe('manual_eft / contact availability', () => {
  it('exactly one provider is available in each payment_enabled state', () => {
    expect(providerOptions({ ...baseSettings, payment_enabled: true }).map((p) => p.id)).toEqual([
      'manual_eft',
    ]);
    expect(providerOptions({ ...baseSettings, payment_enabled: false }).map((p) => p.id)).toEqual([
      'contact',
    ]);
  });

  it('manualEft.isAvailable and contactOnly.isAvailable are exact mirrors', () => {
    for (const payment_enabled of [true, false]) {
      const settings = { ...baseSettings, payment_enabled };
      expect(manualEft.isAvailable(settings)).toBe(payment_enabled);
      expect(contactOnly.isAvailable(settings)).toBe(!payment_enabled);
    }
  });

  it('getPaymentProvider still resolves a provider even when it is not currently offered', () => {
    // Checkout validates isAvailable() separately; lookup by id must not itself gate.
    expect(getPaymentProvider('contact')?.id).toBe('contact');
    expect(getPaymentProvider('manual_eft')?.id).toBe('manual_eft');
    expect(getPaymentProvider('nonsense')).toBeNull();
  });
});

describe('contactOnly.createPayment', () => {
  it('tells the customer KZN Chess will reach out, with their own contact details', async () => {
    const payment = await contactOnly.createPayment(baseOrder, { ...baseSettings, payment_enabled: false });
    expect(payment.kind).toBe('instructions');
    if (payment.kind === 'instructions') {
      expect(payment.lines.join(' ')).toContain('jane@example.com');
      expect(payment.lines.join(' ')).toContain('0821234567');
      // No bank details or amount-due framing — this isn't a payment request.
      expect(payment.lines.join(' ')).not.toMatch(/Account|Reference|Amount/i);
    }
  });

  it('mentions collection specifically when that is the fulfilment method', async () => {
    const payment = await contactOnly.createPayment(baseOrder, baseSettings);
    if (payment.kind === 'instructions') {
      expect(payment.lines.some((l) => l.toLowerCase().includes('collect'))).toBe(true);
    }
  });
});
