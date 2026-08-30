import { formatZar } from './money';
import type { OrderWithItems, StoreSettings } from './types';

export function whatsappLink(number: string, text: string): string {
  return `https://wa.me/${number.replace(/\D/g, '')}?text=${encodeURIComponent(text)}`;
}

/** Customer → store: share the order they just placed. Null if no store number is set. */
export function orderWhatsAppUrl(
  order: OrderWithItems,
  settings: StoreSettings,
  orderUrl: string
): string | null {
  if (!settings.whatsapp_number) return null;
  const items = order.items.map(
    (i) => `• ${i.quantity} × ${i.product_name}${i.variant_name ? ` (${i.variant_name})` : ''}`
  );
  const how =
    order.fulfilment === 'delivery'
      ? 'Delivery'
      : `Collect at ${order.collection_point_name || 'collection point'}`;
  const text = [
    `Hi ${settings.store_name}, I have placed order ${order.order_number} (${formatZar(order.total_cents)}).`,
    ...items,
    how,
    orderUrl,
  ].join('\n');
  return whatsappLink(settings.whatsapp_number, text);
}

/** Admin → customer: open a chat with the order number prefilled. */
export function customerWhatsAppUrl(order: OrderWithItems): string {
  return whatsappLink(
    order.customer_phone,
    `Hi ${order.customer_name}, about your KZN Chess order ${order.order_number}: `
  );
}
