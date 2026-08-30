import { formatZar } from '../money';
import type { PaymentProvider } from './types';

/**
 * Manual payment: the customer pays by EFT using the bank details from store
 * settings (reference = order number), or pays when collecting. An admin marks
 * the order paid from the order page.
 */
export const manualEft: PaymentProvider = {
  id: 'manual_eft',
  label: 'EFT / pay on collection',
  description: 'Pay by bank transfer using your order number as reference, or pay when you collect.',
  isAvailable: () => true,
  async createPayment(order, settings) {
    const lines = [`Amount: ${formatZar(order.total_cents)}`, `Reference: ${order.order_number}`];
    if (settings.bank_details) {
      lines.push(
        ...settings.bank_details
          .split('\n')
          .map((l) => l.trim())
          .filter(Boolean)
      );
    }
    if (order.fulfilment === 'collection') lines.push('Or pay when you collect your order.');
    return {
      kind: 'instructions',
      title: settings.bank_details ? 'Pay by EFT' : 'Payment',
      lines,
    };
  },
};
