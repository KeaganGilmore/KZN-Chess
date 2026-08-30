import type { Order, StoreSettings } from '../types';

export type PaymentInit =
  | { kind: 'instructions'; title: string; lines: string[] }
  | { kind: 'redirect'; url: string; method: 'GET' | 'POST'; fields?: Record<string, string> };

export interface WebhookResult {
  order_id: string;
  paid: boolean;
  reference: string | null;
}

export interface PaymentProvider {
  id: string;
  label: string;
  description: string;
  /** Whether this provider can be offered given current settings. */
  isAvailable(settings: StoreSettings): boolean;
  createPayment(order: Order, settings: StoreSettings): Promise<PaymentInit>;
  handleWebhook?(req: Request): Promise<WebhookResult>;
}
