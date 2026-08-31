import { describe, it, expect } from 'vitest';
import { imagesForVariant } from '@/lib/store/product-helpers';
import type { Product, ProductImage, ProductVariant } from '@/lib/store/types';

function img(id: string, variant_id: string | null, sort_order = 0): ProductImage {
  return { id, product_id: 'p1', variant_id, url: `https://x/${id}.jpg`, alt: null, sort_order };
}

function variant(id: string, name: string): ProductVariant {
  return {
    id,
    product_id: 'p1',
    option_label: 'Colour',
    name,
    sku: null,
    price_delta_cents: 0,
    stock_qty: 5,
    is_active: true,
    sort_order: 0,
  };
}

const base: Product = {
  id: 'p1',
  name: 'Chess Shirt',
  slug: 'chess-shirt',
  description: null,
  category_id: null,
  price_cents: 20000,
  compare_at_cents: null,
  stock_qty: 0,
  is_active: true,
  is_featured: false,
  sort_order: 0,
  created_at: '',
  updated_at: '',
};

const red = variant('v-red', 'Red');
const blue = variant('v-blue', 'Blue');

describe('imagesForVariant', () => {
  it('shows the variant\'s own photos when it switches, ignoring other variants\' photos', () => {
    const p: Product = {
      ...base,
      images: [img('general', null, 0), img('red1', 'v-red', 1), img('blue1', 'v-blue', 2)],
    };
    expect(imagesForVariant(p, red).map((i) => i.id)).toEqual(['red1']);
    expect(imagesForVariant(p, blue).map((i) => i.id)).toEqual(['blue1']);
  });

  it('falls back to general photos when the selected variant has none of its own', () => {
    const p: Product = {
      ...base,
      images: [img('general1', null, 0), img('general2', null, 1), img('blue1', 'v-blue', 2)],
    };
    expect(imagesForVariant(p, red).map((i) => i.id)).toEqual(['general1', 'general2']);
  });

  it('falls back to every photo when there are no general photos either', () => {
    const p: Product = { ...base, images: [img('blue1', 'v-blue', 0)] };
    expect(imagesForVariant(p, red).map((i) => i.id)).toEqual(['blue1']);
  });

  it('uses general photos when no variant is selected', () => {
    const p: Product = {
      ...base,
      images: [img('general', null, 0), img('red1', 'v-red', 1)],
    };
    expect(imagesForVariant(p, null).map((i) => i.id)).toEqual(['general']);
    expect(imagesForVariant(p).map((i) => i.id)).toEqual(['general']);
  });

  it('keeps existing single-image-list products working unchanged (no images tagged)', () => {
    const p: Product = { ...base, images: [img('a', null, 1), img('b', null, 0)] };
    // sorted by sort_order regardless of variant selection
    expect(imagesForVariant(p, red).map((i) => i.id)).toEqual(['b', 'a']);
  });

  it('handles a product with no images at all', () => {
    const p: Product = { ...base, images: [] };
    expect(imagesForVariant(p, red)).toEqual([]);
  });

  it('respects sort_order within the variant-specific set', () => {
    const p: Product = {
      ...base,
      images: [img('red2', 'v-red', 5), img('red1', 'v-red', 1)],
    };
    expect(imagesForVariant(p, red).map((i) => i.id)).toEqual(['red1', 'red2']);
  });
});
