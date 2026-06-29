'use client';

import { useEffect, useRef, useState, type RefObject } from 'react';

/**
 * Responsive chessboard sizing: measures the wrapper element and returns a
 * board width that fills its container but never exceeds `max`. Use the
 * returned ref on a `w-full` wrapper so the board scales down on small screens
 * instead of overflowing.
 */
export function useBoardWidth(max = 440): [RefObject<HTMLDivElement>, number] {
  const ref = useRef<HTMLDivElement>(null);
  // Start small enough to never overflow a phone on first paint, then grow.
  const [width, setWidth] = useState(() => Math.min(max, 320));

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const measure = () => {
      const w = el.clientWidth || el.getBoundingClientRect().width;
      if (w > 0) setWidth(Math.max(160, Math.min(max, Math.floor(w))));
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [max]);

  return [ref, width];
}
