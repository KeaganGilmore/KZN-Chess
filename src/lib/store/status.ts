import type { Fulfilment, OrderStatus } from './types';

export const ORDER_STATUSES: OrderStatus[] = [
  'awaiting_payment',
  'paid',
  'packed',
  'shipped',
  'ready_for_collection',
  'completed',
  'cancelled',
];

export const ORDER_STATUS_LABELS: Record<OrderStatus, string> = {
  awaiting_payment: 'Awaiting payment',
  paid: 'Paid',
  packed: 'Packed',
  shipped: 'Shipped',
  ready_for_collection: 'Ready for collection',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

/** Customer-facing explanation shown on the order page. */
export const ORDER_STATUS_HELP: Record<OrderStatus, string> = {
  awaiting_payment: 'We are waiting for your payment. Use the instructions below.',
  paid: 'Payment received — we are getting your order ready.',
  packed: 'Your order is packed.',
  shipped: 'Your order is on its way.',
  ready_for_collection: 'Your order is ready to collect.',
  completed: 'Order complete. Thank you for supporting KZN Chess!',
  cancelled: 'This order was cancelled.',
};

export const ORDER_STATUS_STYLES: Record<OrderStatus, string> = {
  awaiting_payment: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  paid: 'bg-blue-500/10 text-blue-400 border-blue-500/20',
  packed: 'bg-purple-500/10 text-purple-400 border-purple-500/20',
  shipped: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  ready_for_collection: 'bg-teal-500/10 text-teal-400 border-teal-500/20',
  completed: 'bg-green-500/10 text-green-400 border-green-500/20',
  cancelled: 'bg-red-500/10 text-red-400 border-red-500/20',
};

export function nextStatuses(status: OrderStatus, fulfilment: Fulfilment): OrderStatus[] {
  switch (status) {
    case 'awaiting_payment':
      return ['paid', 'cancelled'];
    case 'paid':
      return ['packed', 'cancelled'];
    case 'packed':
      return [fulfilment === 'delivery' ? 'shipped' : 'ready_for_collection', 'cancelled'];
    case 'shipped':
    case 'ready_for_collection':
      return ['completed', 'cancelled'];
    case 'completed':
      return [];
    case 'cancelled':
      return ['awaiting_payment'];
  }
}

export function isOpenOrder(status: OrderStatus): boolean {
  return status !== 'completed' && status !== 'cancelled';
}
