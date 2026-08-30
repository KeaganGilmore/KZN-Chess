import { describe, it, expect } from 'vitest';
import { nextStatuses } from '@/lib/store/status';

describe('nextStatuses', () => {
  it('follows the delivery flow', () => {
    expect(nextStatuses('awaiting_payment', 'delivery')).toEqual(['paid', 'cancelled']);
    expect(nextStatuses('paid', 'delivery')).toEqual(['packed', 'cancelled']);
    expect(nextStatuses('packed', 'delivery')).toEqual(['shipped', 'cancelled']);
    expect(nextStatuses('shipped', 'delivery')).toEqual(['completed', 'cancelled']);
    expect(nextStatuses('completed', 'delivery')).toEqual([]);
  });
  it('follows the collection flow', () => {
    expect(nextStatuses('packed', 'collection')).toEqual(['ready_for_collection', 'cancelled']);
    expect(nextStatuses('ready_for_collection', 'collection')).toEqual(['completed', 'cancelled']);
  });
  it('lets a cancelled order be reinstated', () => {
    expect(nextStatuses('cancelled', 'delivery')).toEqual(['awaiting_payment']);
  });
});
