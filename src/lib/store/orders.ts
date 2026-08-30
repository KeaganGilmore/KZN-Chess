import { createServerClient } from '@/lib/supabase/server';
import type {
  DeliveryAddress,
  Fulfilment,
  Order,
  OrderEvent,
  OrderItem,
  OrderStatus,
  OrderWithItems,
  PricedLine,
} from './types';

export interface PlaceOrderInput {
  user_id: string | null;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  fulfilment: Fulfilment;
  delivery_address: DeliveryAddress | null;
  collection_point_id: string | null;
  collection_point_name: string | null;
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  payment_provider: string;
  customer_note: string | null;
  lines: PricedLine[];
}

/** Atomic insert via the place_order() function; throws on oversell. */
export async function placeOrder(input: PlaceOrderInput): Promise<Order> {
  const supabase = createServerClient();
  const { lines, ...order } = input;
  const items = lines.map((l) => ({
    product_id: l.product_id,
    variant_id: l.variant_id,
    product_name: l.product_name,
    variant_name: l.variant_name,
    image_url: l.image_url,
    unit_price_cents: l.unit_price_cents,
    quantity: l.quantity,
    line_total_cents: l.line_total_cents,
  }));
  const { data, error } = await supabase.rpc('place_order', { p_order: order, p_items: items });
  if (error) throw new Error(error.message);
  return data as Order;
}

async function withRelations(order: Order): Promise<OrderWithItems> {
  const supabase = createServerClient();
  const [{ data: items }, { data: events }] = await Promise.all([
    supabase.from('order_items').select('*').eq('order_id', order.id).order('id'),
    supabase.from('order_events').select('*').eq('order_id', order.id).order('created_at'),
  ]);
  return {
    ...order,
    items: (items as OrderItem[]) || [],
    events: (events as OrderEvent[]) || [],
  };
}

/** Customer lookup: order number + the private token from the confirmation link. */
export async function getOrderByNumber(orderNumber: string, token: string): Promise<OrderWithItems | null> {
  if (!orderNumber || !token) return null;
  const supabase = createServerClient();
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('order_number', orderNumber)
    .eq('access_token', token)
    .maybeSingle();
  return data ? withRelations(data as Order) : null;
}

export async function getOrderById(id: string): Promise<OrderWithItems | null> {
  const supabase = createServerClient();
  const { data } = await supabase.from('orders').select('*').eq('id', id).maybeSingle();
  return data ? withRelations(data as Order) : null;
}

export async function listOrdersForUser(userId: string): Promise<Order[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('orders')
    .select('*')
    .eq('user_id', userId)
    .order('created_at', { ascending: false });
  return (data as Order[]) || [];
}

export async function listOrders(
  opts: { status?: OrderStatus | 'open' | 'all'; q?: string; limit?: number } = {}
): Promise<Order[]> {
  const supabase = createServerClient();
  let q = supabase
    .from('orders')
    .select('*')
    .order('created_at', { ascending: false })
    .limit(opts.limit ?? 200);
  if (opts.status === 'open') q = q.not('status', 'in', '(completed,cancelled)');
  else if (opts.status && opts.status !== 'all') q = q.eq('status', opts.status);
  if (opts.q) {
    const s = opts.q.replace(/[,()%]/g, ' ').trim().slice(0, 60);
    if (s) {
      q = q.or(
        `order_number.ilike.%${s}%,customer_name.ilike.%${s}%,customer_email.ilike.%${s}%,customer_phone.ilike.%${s}%`
      );
    }
  }
  const { data } = await q;
  return (data as Order[]) || [];
}

export async function setOrderStatus(
  id: string,
  status: OrderStatus,
  note: string | null,
  actorId: string | null
): Promise<Order> {
  const supabase = createServerClient();
  const { data, error } = await supabase.rpc('set_order_status', {
    p_order_id: id,
    p_status: status,
    p_note: note,
    p_actor: actorId,
  });
  if (error) throw new Error(error.message);
  return data as Order;
}

export async function updateOrderAdminFields(
  id: string,
  fields: { admin_note?: string | null; payment_reference?: string | null }
): Promise<void> {
  const supabase = createServerClient();
  const { error } = await supabase
    .from('orders')
    .update({ ...fields, updated_at: new Date().toISOString() })
    .eq('id', id);
  if (error) throw new Error(error.message);
}

/** Admin overview counts, computed live. */
export async function orderCounts(): Promise<{
  awaiting_payment: number;
  to_pack: number;
  to_dispatch: number;
}> {
  const supabase = createServerClient();
  const count = async (statuses: string[]) => {
    const { count } = await supabase
      .from('orders')
      .select('id', { count: 'exact', head: true })
      .in('status', statuses);
    return count ?? 0;
  };
  const [awaiting_payment, to_pack, to_dispatch] = await Promise.all([
    count(['awaiting_payment']),
    count(['paid']),
    count(['packed']),
  ]);
  return { awaiting_payment, to_pack, to_dispatch };
}
