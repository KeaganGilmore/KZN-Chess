import { describe, it, expect } from 'vitest';
import { priceCart } from '@/lib/store/cart';
import type { Product, StoreSettings } from '@/lib/store/types';

const settings: StoreSettings = {
  id: 1, store_enabled: true, payment_enabled: true, delivery_enabled: true, collection_enabled: true,
  delivery_fee_cents: 9900, free_delivery_threshold_cents: 100000,
  bank_details: null, whatsapp_number: null, store_name: 'KZN Chess Store', tagline: null,
  updated_at: '',
};

const board: Product = {
  id: 'p1', name: 'Tournament Board', slug: 'tournament-board', description: null, category_id: null,
  price_cents: 25000, compare_at_cents: null, stock_qty: 3, is_active: true, is_featured: false,
  sort_order: 0, created_at: '', updated_at: '', variants: [],
  images: [{ id: 'i1', product_id: 'p1', variant_id: null, url: 'https://x/board.jpg', alt: null, sort_order: 0 }],
};

const shirt: Product = {
  id: 'p2', name: 'KZN Chess Shirt', slug: 'kzn-chess-shirt', description: null, category_id: null,
  price_cents: 20000, compare_at_cents: null, stock_qty: 0, is_active: true, is_featured: false,
  sort_order: 0, created_at: '', updated_at: '', images: [],
  variants: [
    { id: 'v1', product_id: 'p2', option_label: 'Size', name: 'M', sku: null, price_delta_cents: 0, stock_qty: 5, is_active: true, sort_order: 0 },
    { id: 'v2', product_id: 'p2', option_label: 'Size', name: 'XXL', sku: null, price_delta_cents: 2000, stock_qty: 0, is_active: true, sort_order: 1 },
  ],
};

describe('priceCart', () => {
  it('prices simple products and adds the delivery fee', () => {
    const c = priceCart([{ product_id: 'p1', variant_id: null, quantity: 2 }], [board], settings, 'delivery');
    expect(c.ok).toBe(true);
    expect(c.lines[0]).toMatchObject({ unit_price_cents: 25000, line_total_cents: 50000, available: 3, image_url: 'https://x/board.jpg' });
    expect(c.subtotal_cents).toBe(50000);
    expect(c.delivery_fee_cents).toBe(9900);
    expect(c.total_cents).toBe(59900);
  });

  it('applies variant price deltas and uses variant stock', () => {
    const c = priceCart([{ product_id: 'p2', variant_id: 'v2', quantity: 1 }], [shirt], settings, 'collection');
    expect(c.lines[0]).toMatchObject({ unit_price_cents: 22000, variant_name: 'XXL', available: 0, problem: 'out_of_stock' });
    expect(c.ok).toBe(false);
    expect(c.delivery_fee_cents).toBe(0);
  });

  it('flags insufficient stock but keeps the requested quantity', () => {
    const c = priceCart([{ product_id: 'p1', variant_id: null, quantity: 5 }], [board], settings, 'collection');
    expect(c.lines[0]).toMatchObject({ quantity: 5, available: 3, problem: 'insufficient_stock' });
    expect(c.ok).toBe(false);
  });

  it('flags unknown or inactive products', () => {
    const c = priceCart(
      [{ product_id: 'missing', variant_id: null, quantity: 1 }, { product_id: 'p1', variant_id: null, quantity: 1 }],
      [{ ...board, is_active: false }], settings, 'collection'
    );
    expect(c.lines.map((l) => l.problem)).toEqual(['inactive', 'inactive']);
    expect(c.ok).toBe(false);
  });

  it('waives delivery above the free-delivery threshold', () => {
    const c = priceCart([{ product_id: 'p1', variant_id: null, quantity: 3 }], [{ ...board, price_cents: 40000 }], settings, 'delivery');
    expect(c.subtotal_cents).toBe(120000);
    expect(c.delivery_fee_cents).toBe(0);
  });

  it('merges duplicate lines', () => {
    const c = priceCart(
      [{ product_id: 'p1', variant_id: null, quantity: 1 }, { product_id: 'p1', variant_id: null, quantity: 1 }],
      [{ ...board, stock_qty: 100 }], settings, 'collection'
    );
    expect(c.lines).toHaveLength(1);
    expect(c.lines[0].quantity).toBe(2);
  });

  it('allows a large quantity, bounded only by stock rather than an artificial cap', () => {
    const big = priceCart([{ product_id: 'p1', variant_id: null, quantity: 999 }], [{ ...board, stock_qty: 1000 }], settings, 'collection');
    expect(big.lines[0].quantity).toBe(999);
    expect(big.lines[0].problem).toBeNull();
  });

  it('ignores a variant id that does not belong to the product', () => {
    const c = priceCart([{ product_id: 'p1', variant_id: 'v1', quantity: 1 }], [board], settings, 'collection');
    expect(c.lines[0].problem).toBe('inactive');
  });

  it('requires a variant when the product has variants', () => {
    const c = priceCart([{ product_id: 'p2', variant_id: null, quantity: 1 }], [shirt], settings, 'collection');
    expect(c.lines[0].problem).toBe('inactive');
  });

  it('shows the selected variant\'s own photo on the cart line when it has one', () => {
    const shirtWithPhotos = {
      ...shirt,
      images: [
        { id: 'gen', product_id: 'p2', variant_id: null, url: 'https://x/shirt.jpg', alt: null, sort_order: 0 },
        { id: 'xxl', product_id: 'p2', variant_id: 'v2', url: 'https://x/shirt-xxl.jpg', alt: null, sort_order: 0 },
      ],
    };
    const c = priceCart([{ product_id: 'p2', variant_id: 'v2', quantity: 1 }], [shirtWithPhotos], settings, 'collection');
    expect(c.lines[0].image_url).toBe('https://x/shirt-xxl.jpg');
  });

  it('falls back to the general photo when the selected variant has none of its own', () => {
    const shirtWithPhotos = {
      ...shirt,
      images: [
        { id: 'gen', product_id: 'p2', variant_id: null, url: 'https://x/shirt.jpg', alt: null, sort_order: 0 },
        { id: 'xxl', product_id: 'p2', variant_id: 'v2', url: 'https://x/shirt-xxl.jpg', alt: null, sort_order: 0 },
      ],
    };
    // v1 ('M') has no dedicated photo — should show the general one, not XXL's.
    const c = priceCart([{ product_id: 'p2', variant_id: 'v1', quantity: 1 }], [shirtWithPhotos], settings, 'collection');
    expect(c.lines[0].image_url).toBe('https://x/shirt.jpg');
  });
});
