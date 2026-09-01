'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { CartItem } from '@/lib/store/types';
import { isValidCartItem, normalizeCart } from '@/lib/store/cart';

const STORAGE_KEY = 'kznchess.cart.v1';

interface CartContextValue {
  items: CartItem[];
  count: number;
  hydrated: boolean;
  add: (item: CartItem) => void;
  setQuantity: (productId: string, variantId: string | null, quantity: number) => void;
  remove: (productId: string, variantId: string | null) => void;
  clear: () => void;
}

const CartContext = createContext<CartContextValue | null>(null);

export function CartProvider({ children }: { children: React.ReactNode }) {
  const [items, setItems] = useState<CartItem[]>([]);
  const [hydrated, setHydrated] = useState(false);

  useEffect(() => {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      if (raw) {
        // Drop anything the pricing API would reject (tampered/legacy entries)
        // so a bad line can never wedge the whole cart behind a 400.
        const parsed: unknown = JSON.parse(raw);
        const valid = Array.isArray(parsed) ? parsed.filter(isValidCartItem) : [];
        setItems(normalizeCart(valid));
      }
    } catch {}
    setHydrated(true);
  }, []);

  useEffect(() => {
    if (!hydrated) return;
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
    } catch {}
  }, [items, hydrated]);

  const add = useCallback((item: CartItem) => {
    if (!isValidCartItem(item)) return;
    setItems((prev) => normalizeCart([...prev, item]));
  }, []);
  const setQuantity = useCallback(
    (productId: string, variantId: string | null, quantity: number) => {
      setItems((prev) =>
        normalizeCart(
          prev.map((l) =>
            l.product_id === productId && (l.variant_id ?? null) === (variantId ?? null)
              ? { ...l, quantity: Math.max(1, Math.floor(quantity)) }
              : l
          )
        )
      );
    },
    []
  );
  const remove = useCallback((productId: string, variantId: string | null) => {
    setItems((prev) =>
      prev.filter(
        (l) => !(l.product_id === productId && (l.variant_id ?? null) === (variantId ?? null))
      )
    );
  }, []);
  const clear = useCallback(() => setItems([]), []);

  const value = useMemo<CartContextValue>(
    () => ({
      items,
      count: items.reduce((n, l) => n + l.quantity, 0),
      hydrated,
      add,
      setQuantity,
      remove,
      clear,
    }),
    [items, hydrated, add, setQuantity, remove, clear]
  );

  return <CartContext.Provider value={value}>{children}</CartContext.Provider>;
}

export function useCart(): CartContextValue {
  const ctx = useContext(CartContext);
  if (!ctx) throw new Error('useCart must be used within CartProvider');
  return ctx;
}
