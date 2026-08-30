export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { checkoutSchema } from '@/lib/store/validation';
import { getProductsByIds, getStoreSettings } from '@/lib/store/catalog';
import { priceCart } from '@/lib/store/cart';
import { placeOrder } from '@/lib/store/orders';
import { getPaymentProvider } from '@/lib/store/payments';
import type { Order } from '@/lib/store/types';

export async function POST(request: NextRequest) {
  const parsed = checkoutSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Please check the highlighted fields', issues: parsed.error.issues },
      { status: 400 }
    );
  }
  const body = parsed.data;

  const settings = await getStoreSettings();
  if (!settings.store_enabled) {
    return NextResponse.json({ error: 'The store is currently closed' }, { status: 503 });
  }

  if (body.fulfilment === 'delivery') {
    if (!settings.delivery_enabled) {
      return NextResponse.json({ error: 'Delivery is not available right now' }, { status: 400 });
    }
    if (!body.delivery_address) {
      return NextResponse.json({ error: 'Delivery address is required' }, { status: 400 });
    }
  } else {
    if (!settings.collection_enabled) {
      return NextResponse.json({ error: 'Collection is not available right now' }, { status: 400 });
    }
    if (!body.collection_point_id) {
      return NextResponse.json({ error: 'Choose a collection point' }, { status: 400 });
    }
  }

  const provider = getPaymentProvider(body.payment_provider);
  if (!provider || !provider.isAvailable(settings)) {
    return NextResponse.json({ error: 'Payment method unavailable' }, { status: 400 });
  }

  const supabase = createServerClient();
  let collectionPointName: string | null = null;
  if (body.fulfilment === 'collection') {
    const { data: cp } = await supabase
      .from('collection_points')
      .select('name')
      .eq('id', body.collection_point_id!)
      .eq('is_active', true)
      .maybeSingle();
    if (!cp) {
      return NextResponse.json({ error: 'Collection point unavailable' }, { status: 400 });
    }
    collectionPointName = cp.name;
  }

  const products = await getProductsByIds([...new Set(body.items.map((i) => i.product_id))]);
  const cart = priceCart(body.items, products, settings, body.fulfilment);
  if (!cart.ok) {
    return NextResponse.json(
      { error: 'Some items in your cart are no longer available', cart },
      { status: 409 }
    );
  }

  const user = await getCurrentUser();
  let order: Order;
  try {
    order = await placeOrder({
      user_id: user?.id ?? null,
      customer_name: body.customer.name,
      customer_email: body.customer.email.toLowerCase(),
      customer_phone: body.customer.phone,
      fulfilment: body.fulfilment,
      delivery_address: body.fulfilment === 'delivery' ? body.delivery_address! : null,
      collection_point_id: body.fulfilment === 'collection' ? body.collection_point_id! : null,
      collection_point_name: collectionPointName,
      subtotal_cents: cart.subtotal_cents,
      delivery_fee_cents: cart.delivery_fee_cents,
      total_cents: cart.total_cents,
      payment_provider: provider.id,
      customer_note: body.note || null,
      lines: cart.lines,
    });
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : String(err);
    // place_order raises on oversell between pricing and insert (the
    // stock_qty >= 0 CHECK, or an inactive product/variant).
    if (/stock_qty|unavailable/i.test(message)) {
      return NextResponse.json(
        { error: 'An item sold out while you were checking out. Please review your cart.' },
        { status: 409 }
      );
    }
    console.error('Checkout place_order failed:', message);
    return NextResponse.json(
      { error: 'We could not place your order. Please try again in a moment.' },
      { status: 500 }
    );
  }

  const payment = await provider.createPayment(order, settings);
  return NextResponse.json(
    {
      order_number: order.order_number,
      access_token: order.access_token,
      payment,
    },
    { status: 201 }
  );
}
