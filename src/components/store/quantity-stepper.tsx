'use client';

import { useEffect, useState } from 'react';
import { Minus, Plus } from 'lucide-react';
import { Button } from '@/components/ui/button';

/** +/- buttons plus a typeable field; the value is clamped to [min, max] on blur/Enter. */
export function QuantityStepper({
  value,
  onChange,
  min = 1,
  max,
  disabled,
}: {
  value: number;
  onChange: (value: number) => void;
  min?: number;
  max?: number;
  disabled?: boolean;
}) {
  const [text, setText] = useState(String(value));

  useEffect(() => setText(String(value)), [value]);

  const commit = (raw: string) => {
    const parsed = parseInt(raw, 10);
    const clamped = Number.isFinite(parsed)
      ? Math.min(max ?? Infinity, Math.max(min, parsed))
      : value;
    setText(String(clamped));
    if (clamped !== value) onChange(clamped);
  };

  return (
    <div className="inline-flex items-center border border-border rounded-md">
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11"
        aria-label="Decrease quantity"
        disabled={disabled || value <= min}
        onClick={() => onChange(Math.max(min, value - 1))}
      >
        <Minus className="w-4 h-4" />
      </Button>
      <input
        type="text"
        inputMode="numeric"
        pattern="[0-9]*"
        className="w-12 bg-transparent text-center text-sm tabular-nums outline-none disabled:opacity-50"
        value={text}
        disabled={disabled}
        aria-label="Quantity"
        onChange={(e) => setText(e.target.value.replace(/[^0-9]/g, ''))}
        onBlur={(e) => commit(e.target.value)}
        onKeyDown={(e) => {
          if (e.key === 'Enter') e.currentTarget.blur();
        }}
      />
      <Button
        type="button"
        variant="ghost"
        size="icon"
        className="h-11 w-11"
        aria-label="Increase quantity"
        disabled={disabled || (max != null && value >= max)}
        onClick={() => onChange(max != null ? Math.min(max, value + 1) : value + 1)}
      >
        <Plus className="w-4 h-4" />
      </Button>
    </div>
  );
}
