'use client';

import { useCallback, useEffect, useRef, useState } from 'react';
import type { CartItem, Fulfilment, PricedCart } from '@/lib/store/types';

export interface PriceSettings {
  delivery_enabled: boolean;
  collection_enabled: boolean;
  delivery_fee_cents: number;
  free_delivery_threshold_cents: number | null;
}

/**
 * Re-prices the cart on the server (debounced) whenever the items or the
 * fulfilment method change. Stale responses are dropped so a fast second
 * request can never be overwritten by a slow first one.
 */
export function usePricedCart(
  items: CartItem[],
  fulfilment: Fulfilment,
  enabled = true,
  delayMs = 250
) {
  const [cart, setCart] = useState<PricedCart | null>(null);
  const [settings, setSettings] = useState<PriceSettings | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [nonce, setNonce] = useState(0);
  const seq = useRef(0);

  const refresh = useCallback(() => setNonce((n) => n + 1), []);

  useEffect(() => {
    if (!enabled) return;
    if (items.length === 0) {
      setCart(null);
      setLoading(false);
      setError(null);
      return;
    }
    const id = ++seq.current;
    const controller = new AbortController();
    setLoading(true);
    const timer = setTimeout(async () => {
      try {
        const res = await fetch('/api/store/cart/price', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ items, fulfilment }),
          signal: controller.signal,
        });
        if (!res.ok) throw new Error('price failed');
        const data = (await res.json()) as { cart: PricedCart; settings: PriceSettings };
        if (id !== seq.current) return;
        setCart(data.cart);
        setSettings(data.settings);
        setError(null);
      } catch {
        if (controller.signal.aborted || id !== seq.current) return;
        setError('Could not check prices and stock. Please try again.');
      } finally {
        if (id === seq.current) setLoading(false);
      }
    }, delayMs);
    return () => {
      clearTimeout(timer);
      controller.abort();
    };
  }, [items, fulfilment, enabled, delayMs, nonce]);

  return { cart, settings, loading, error, refresh };
}
