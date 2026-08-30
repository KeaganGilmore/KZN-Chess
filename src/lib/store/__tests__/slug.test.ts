import { describe, it, expect } from 'vitest';
import { slugify } from '@/lib/store/slug';

describe('slugify', () => {
  it('lowercases, strips accents and punctuation, collapses dashes', () => {
    expect(slugify('Staunton Chess Set (No. 6)')).toBe('staunton-chess-set-no-6');
    expect(slugify('  Café  Board ')).toBe('cafe-board');
    expect(slugify('!!!')).toBe('item');
  });
});
