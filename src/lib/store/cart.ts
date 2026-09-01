import type { CartItem, Fulfilment, PricedCart, PricedLine, Product, StoreSettings } from './types';
import { activeVariants, hasVariants, imagesForVariant, unitPrice } from './product-helpers';

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Whether a stored cart line has ids the API will accept. The browser cart
 * uses this when hydrating from localStorage so a tampered or legacy entry
 * can never wedge the cart behind a 400 from the pricing endpoint.
 */
export function isValidCartItem(it: unknown): it is CartItem {
  if (!it || typeof it !== 'object') return false;
  const { product_id, variant_id } = it as Record<string, unknown>;
  if (typeof product_id !== 'string' || !UUID_RE.test(product_id)) return false;
  if (variant_id != null && (typeof variant_id !== 'string' || !UUID_RE.test(variant_id))) return false;
  return true;
}

/** Merge duplicate (product, variant) lines, summing their quantities. */
export function normalizeCart(items: CartItem[]): CartItem[] {
  const map = new Map<string, CartItem>();
  for (const it of items) {
    if (!it || typeof it.product_id !== 'string') continue;
    const key = `${it.product_id}:${it.variant_id ?? ''}`;
    const qty = Math.max(0, Math.floor(Number(it.quantity) || 0));
    const existing = map.get(key);
    const total = (existing?.quantity ?? 0) + qty;
    map.set(key, { product_id: it.product_id, variant_id: it.variant_id ?? null, quantity: total });
  }
  return [...map.values()].filter((l) => l.quantity > 0);
}

/**
 * Price a cart against fresh product rows. Never mutates quantities — it
 * reports `available` and a `problem` per line so the UI can explain, and
 * `ok` tells checkout whether every line can be fulfilled.
 */
export function priceCart(
  items: CartItem[],
  products: Product[],
  settings: StoreSettings,
  fulfilment: Fulfilment
): PricedCart {
  const byId = new Map(products.map((p) => [p.id, p]));
  const lines: PricedLine[] = normalizeCart(items).map((it) => {
    const p = byId.get(it.product_id);
    const base: PricedLine = {
      product_id: it.product_id,
      variant_id: it.variant_id,
      product_slug: p?.slug ?? null,
      product_name: p?.name ?? 'Unavailable item',
      variant_name: null,
      image_url: p ? (imagesForVariant(p)[0]?.url ?? null) : null,
      unit_price_cents: p?.price_cents ?? 0,
      quantity: it.quantity,
      line_total_cents: 0,
      available: 0,
      problem: null,
    };
    if (!p || !p.is_active) return { ...base, problem: 'inactive' };

    let available: number;
    if (it.variant_id) {
      const v = activeVariants(p).find((x) => x.id === it.variant_id);
      if (!v) return { ...base, problem: 'inactive' };
      base.variant_name = v.name;
      base.unit_price_cents = unitPrice(p, v);
      // Re-derive the photo now that the variant is known, so a variant with
      // its own shot overrides the general one picked above.
      base.image_url = imagesForVariant(p, v)[0]?.url ?? null;
      available = v.stock_qty;
    } else {
      if (hasVariants(p)) return { ...base, problem: 'inactive' }; // must pick a variant
      available = p.stock_qty;
    }

    const line_total_cents = base.unit_price_cents * it.quantity;
    const problem =
      available <= 0 ? 'out_of_stock' : it.quantity > available ? 'insufficient_stock' : null;
    return { ...base, line_total_cents, available, problem };
  });

  const subtotal_cents = lines.reduce(
    (n, l) => n + (l.problem === 'inactive' ? 0 : l.line_total_cents),
    0
  );
  const freeDelivery =
    settings.free_delivery_threshold_cents != null &&
    subtotal_cents >= settings.free_delivery_threshold_cents;
  const delivery_fee_cents =
    fulfilment === 'delivery' && !freeDelivery ? settings.delivery_fee_cents : 0;

  return {
    lines,
    subtotal_cents,
    delivery_fee_cents,
    total_cents: subtotal_cents + delivery_fee_cents,
    ok: lines.length > 0 && lines.every((l) => l.problem === null),
  };
}
