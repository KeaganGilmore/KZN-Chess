export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { z } from 'zod';
import { cartItemSchema } from '@/lib/store/validation';
import { getProductsByIds, getStoreSettings } from '@/lib/store/catalog';
import { priceCart } from '@/lib/store/cart';

const bodySchema = z.object({
  items: z.array(cartItemSchema).max(50),
  fulfilment: z.enum(['delivery', 'collection']).default('collection'),
});

export async function POST(request: NextRequest) {
  const parsed = bodySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid cart' }, { status: 400 });
  }
  const { items, fulfilment } = parsed.data;

  const [settings, products] = await Promise.all([
    getStoreSettings(),
    getProductsByIds([...new Set(items.map((i) => i.product_id))]),
  ]);

  return NextResponse.json({
    cart: priceCart(items, products, settings, fulfilment),
    settings: {
      delivery_enabled: settings.delivery_enabled,
      collection_enabled: settings.collection_enabled,
      delivery_fee_cents: settings.delivery_fee_cents,
      free_delivery_threshold_cents: settings.free_delivery_threshold_cents,
    },
  });
}
