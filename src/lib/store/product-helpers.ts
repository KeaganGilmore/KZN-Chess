import type { Product, ProductImage, ProductVariant } from './types';

/** Sort variants/images by sort_order; returns the product for chaining. */
export function sortRelations<T extends Product>(p: T): T {
  p.variants = [...(p.variants || [])].sort((a, b) => a.sort_order - b.sort_order);
  p.images = [...(p.images || [])].sort((a, b) => a.sort_order - b.sort_order);
  return p;
}

export function activeVariants(p: Product): ProductVariant[] {
  return (p.variants || []).filter((v) => v.is_active);
}

export function hasVariants(p: Product): boolean {
  return activeVariants(p).length > 0;
}

/** The variant to preselect: the only one, when there's exactly one; otherwise none yet. */
export function defaultVariantId(p: Product): string | null {
  const vs = activeVariants(p);
  return vs.length === 1 ? vs[0].id : null;
}

export function unitPrice(p: Product, v?: ProductVariant | null): number {
  return p.price_cents + (v?.price_delta_cents ?? 0);
}

/** Stock for a specific variant, or the product's own stock when it has none. */
export function availableStock(p: Product, v?: ProductVariant | null): number {
  if (v) return v.stock_qty;
  if (hasVariants(p)) return activeVariants(p).reduce((n, x) => n + x.stock_qty, 0);
  return p.stock_qty;
}

export function inStock(p: Product): boolean {
  return availableStock(p) > 0;
}

/** Lowest sellable price (products with variants may have deltas). */
export function fromPrice(p: Product): number {
  const vs = activeVariants(p);
  if (vs.length === 0) return p.price_cents;
  return Math.min(...vs.map((v) => unitPrice(p, v)));
}

export function primaryImage(p: Product): string | null {
  const imgs = [...(p.images || [])].sort((a, b) => a.sort_order - b.sort_order);
  return imgs[0]?.url ?? null;
}

/**
 * Photos to show for the given variant selection (sorted): the variant's own
 * photos if it has any, otherwise the product's general (untagged) photos,
 * otherwise every photo — so a variant without a dedicated shot still shows
 * something rather than an empty gallery. `variant` null/undefined (no
 * selection yet, or a product with no variants) uses the general photos.
 */
export function imagesForVariant(p: Product, variant?: ProductVariant | null): ProductImage[] {
  const all = [...(p.images || [])].sort((a, b) => a.sort_order - b.sort_order);
  if (variant) {
    const own = all.filter((img) => img.variant_id === variant.id);
    if (own.length > 0) return own;
  }
  const general = all.filter((img) => img.variant_id === null);
  return general.length > 0 ? general : all;
}
