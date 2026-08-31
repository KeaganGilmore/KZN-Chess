import { describe, it, expect } from 'vitest';
import { imageSchema, imageUrlSchema, productSchema, variantSchema } from '@/lib/store/validation';

describe('imageUrlSchema', () => {
  it('accepts paths produced by /api/upload', () => {
    for (const u of [
      '/api/media/store/1785919788345-0swyz2kp8er.jpeg',
      '/api/media/tournament-media/1782751656181-2gk0joi2rru.jpg',
    ]) {
      expect(imageUrlSchema.safeParse(u).success, u).toBe(true);
    }
  });

  it('accepts absolute https URLs (images hosted elsewhere)', () => {
    expect(imageUrlSchema.safeParse('https://example.com/board.jpg').success).toBe(true);
  });

  it('rejects traversal, other schemes and junk', () => {
    for (const u of [
      '/api/media/../../etc/passwd',
      '/api/media/store/../../../secret.jpg',
      '/uploads/x.jpg',
      'javascript:alert(1)',
      'http://insecure.example.com/x.jpg',
      '',
    ]) {
      expect(imageUrlSchema.safeParse(u).success, u).toBe(false);
    }
  });
});

describe('productSchema with uploaded images', () => {
  const base = {
    name: 'Tournament Board',
    price_cents: 25000,
    variants: [],
  };

  it('accepts a product whose image came from the upload endpoint', () => {
    const res = productSchema.safeParse({
      ...base,
      images: [{ url: '/api/media/store/1785919788345-abc.jpg', alt: 'Board', sort_order: 0 }],
    });
    expect(res.success).toBe(true);
  });

  it('still rejects a genuinely invalid image url', () => {
    const res = productSchema.safeParse({ ...base, images: [{ url: 'not-a-url' }] });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.error.issues[0].path.join('.')).toBe('images.0.url');
    }
  });
});

describe('variant/image correlation (client_key / variant_key)', () => {
  it('variantSchema requires a client_key', () => {
    const withKey = variantSchema.safeParse({ client_key: 'v-123', name: 'Red' });
    expect(withKey.success).toBe(true);
    const withoutKey = variantSchema.safeParse({ name: 'Red' });
    expect(withoutKey.success).toBe(false);
  });

  it('imageSchema defaults variant_key to null and accepts an explicit one', () => {
    const noKey = imageSchema.safeParse({ url: 'https://example.com/a.jpg' });
    expect(noKey.success).toBe(true);
    if (noKey.success) expect(noKey.data.variant_key).toBeNull();

    const withKey = imageSchema.safeParse({ url: 'https://example.com/a.jpg', variant_key: 'v-123' });
    expect(withKey.success).toBe(true);
    if (withKey.success) expect(withKey.data.variant_key).toBe('v-123');
  });

  it('productSchema accepts a variant and an image referencing its client_key', () => {
    const res = productSchema.safeParse({
      name: 'Chess Shirt',
      price_cents: 20000,
      variants: [{ client_key: 'v-red', name: 'Red' }, { client_key: 'v-blue', name: 'Blue' }],
      images: [
        { url: 'https://example.com/general.jpg' },
        { url: 'https://example.com/red.jpg', variant_key: 'v-red' },
      ],
    });
    expect(res.success).toBe(true);
    if (res.success) {
      expect(res.data.variants.map((v) => v.client_key)).toEqual(['v-red', 'v-blue']);
      expect(res.data.images.map((i) => i.variant_key)).toEqual([null, 'v-red']);
    }
  });
});
