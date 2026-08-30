import { describe, it, expect } from 'vitest';
import { formatZar, randsToCents } from '@/lib/store/money';

describe('formatZar', () => {
  it('formats cents with space thousands separators', () => {
    expect(formatZar(0)).toBe('R0.00');
    expect(formatZar(5)).toBe('R0.05');
    expect(formatZar(123456)).toBe('R1 234.56');
    expect(formatZar(100000000)).toBe('R1 000 000.00');
  });
  it('handles negatives', () => {
    expect(formatZar(-2500)).toBe('-R25.00');
  });
});

describe('randsToCents', () => {
  it('parses plain and formatted rand amounts', () => {
    expect(randsToCents('450')).toBe(45000);
    expect(randsToCents('R1 234.50')).toBe(123450);
    expect(randsToCents('1,234.5')).toBe(123450);
    expect(randsToCents(12.345)).toBe(1235);
  });
  it('treats a trailing comma-decimal as South African decimal notation', () => {
    expect(randsToCents('12,50')).toBe(1250);
    expect(randsToCents('R1 234,5')).toBe(123450);
    expect(randsToCents('1,234')).toBe(123400);
  });
  it('rejects invalid or negative input', () => {
    expect(randsToCents('abc')).toBeNull();
    expect(randsToCents('-5')).toBeNull();
    expect(randsToCents('')).toBeNull();
  });
});
