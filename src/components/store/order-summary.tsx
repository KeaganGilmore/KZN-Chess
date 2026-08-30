import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import type { Fulfilment } from '@/lib/store/types';
import { formatZar } from '@/lib/store/money';
import { cn } from '@/lib/utils';

export interface OrderSummaryLine {
  product_name: string;
  variant_name: string | null;
  image_url: string | null;
  unit_price_cents: number;
  quantity: number;
  line_total_cents: number;
}

export function OrderSummary({
  lines,
  subtotal_cents,
  delivery_fee_cents,
  total_cents,
  fulfilment,
  className,
}: {
  lines: OrderSummaryLine[];
  subtotal_cents: number;
  delivery_fee_cents: number;
  total_cents: number;
  fulfilment: Fulfilment;
  className?: string;
}) {
  return (
    <div className={cn('space-y-4', className)}>
      <ul className="divide-y divide-border">
        {lines.map((l, i) => (
          <li key={`${l.product_name}-${l.variant_name ?? ''}-${i}`} className="flex gap-3 py-3">
            <div className="relative w-14 h-14 shrink-0 rounded-md overflow-hidden bg-secondary border border-border">
              {l.image_url ? (
                <Image
                  src={l.image_url}
                  alt={l.product_name}
                  fill
                  sizes="56px"
                  className="object-cover"
                />
              ) : (
                <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/60">
                  <ShoppingBag className="w-5 h-5" />
                </div>
              )}
            </div>
            <div className="flex-1 min-w-0">
              <p className="text-sm font-medium leading-snug line-clamp-2">{l.product_name}</p>
              {l.variant_name && (
                <p className="text-xs text-muted-foreground">{l.variant_name}</p>
              )}
              <p className="text-xs text-muted-foreground tabular-nums">
                {l.quantity} × {formatZar(l.unit_price_cents)}
              </p>
            </div>
            <p className="text-sm font-medium tabular-nums shrink-0">
              {formatZar(l.line_total_cents)}
            </p>
          </li>
        ))}
      </ul>

      <dl className="space-y-2 text-sm border-t border-border pt-4">
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">Subtotal</dt>
          <dd className="tabular-nums">{formatZar(subtotal_cents)}</dd>
        </div>
        <div className="flex justify-between gap-4">
          <dt className="text-muted-foreground">
            {fulfilment === 'delivery' ? 'Delivery' : 'Collection'}
          </dt>
          <dd className="tabular-nums">
            {fulfilment === 'collection'
              ? 'Free'
              : delivery_fee_cents === 0
                ? 'Free'
                : formatZar(delivery_fee_cents)}
          </dd>
        </div>
        <div className="flex justify-between gap-4 text-base font-bold border-t border-border pt-3">
          <dt>Total</dt>
          <dd className="tabular-nums">{formatZar(total_cents)}</dd>
        </div>
      </dl>
      <p className="text-xs text-muted-foreground">Prices include VAT.</p>
    </div>
  );
}
