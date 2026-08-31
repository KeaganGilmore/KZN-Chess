import { describe, it, expect } from 'vitest';
import { imageUrlSchema, productSchema } from '@/lib/store/validation';

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
