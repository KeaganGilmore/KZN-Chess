import type { PaymentProvider } from './types';

/**
 * Used when the store owner has switched online payment off (store_settings
 * .payment_enabled = false). The order is still placed normally — same
 * place_order call, stock reserved, appears in Admin > Orders exactly like
 * any other order — it simply carries no payment instructions. The admin
 * arranges payment with the customer directly and marks the order paid once
 * that's settled, the same way they'd confirm an EFT.
 */
export const contactOnly: PaymentProvider = {
  id: 'contact',
  label: "We'll contact you",
  description: "We'll reach out by email or phone to arrange payment and confirm your order.",
  isAvailable: (settings) => !settings.payment_enabled,
  async createPayment(order, settings) {
    const lines = [
      `Thank you for ordering with ${settings.store_name} — we really appreciate it. We'll be in touch at ${order.customer_email} or ${order.customer_phone} shortly to arrange payment and confirm the details of your order.`,
    ];
    if (order.fulfilment === 'collection') {
      lines.push("We'll have everything sorted before it's ready for you to collect.");
    }
    return {
      kind: 'instructions',
      title: 'Thank you for your order!',
      lines,
    };
  },
};
