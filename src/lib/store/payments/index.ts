import type { StoreSettings } from '../types';
import type { PaymentProvider } from './types';
import { manualEft } from './manual-eft';
import { contactOnly } from './contact';

export type { PaymentInit, PaymentProvider, WebhookResult } from './types';

/**
 * Registry. Add PayFast/Yoco here later; checkout and order pages need no
 * changes. manualEft and contactOnly are each other's mirror image on
 * settings.payment_enabled, so exactly one of them is ever available at a
 * time — see their isAvailable().
 */
const PROVIDERS: PaymentProvider[] = [manualEft, contactOnly];

export function getPaymentProvider(id: string): PaymentProvider | null {
  return PROVIDERS.find((p) => p.id === id) ?? null;
}

export function availableProviders(settings: StoreSettings): PaymentProvider[] {
  return PROVIDERS.filter((p) => p.isAvailable(settings));
}

export interface ProviderOption {
  id: string;
  label: string;
  description: string;
}

/** Serialisable summary for client components. */
export function providerOptions(settings: StoreSettings): ProviderOption[] {
  return availableProviders(settings).map(({ id, label, description }) => ({ id, label, description }));
}
