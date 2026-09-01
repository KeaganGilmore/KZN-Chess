'use client';

import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { AlertTriangle, ArrowRight, Loader2, ShoppingBag, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Skeleton } from '@/components/ui/skeleton';
import { formatZar } from '@/lib/store/money';
import type { PricedLine } from '@/lib/store/types';
import { cn } from '@/lib/utils';
import { useCart } from './cart-provider';
import { usePricedCart } from './use-priced-cart';
import { QuantityStepper } from './quantity-stepper';

function LineWarning({
  line,
  onReduce,
  onRemove,
}: {
  line: PricedLine;
  onReduce: () => void;
  onRemove: () => void;
}) {
  if (!line.problem) return null;
  const message =
    line.problem === 'inactive'
      ? 'No longer available'
      : line.problem === 'out_of_stock'
        ? 'Sold out'
        : `Only ${line.available} available`;
  return (
    <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-orange-400">
      <AlertTriangle className="w-3.5 h-3.5 shrink-0" />
      <span>{message}</span>
      {line.problem === 'insufficient_stock' ? (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={onReduce}
        >
          Reduce to {line.available}
        </Button>
      ) : (
        <Button
          type="button"
          size="sm"
          variant="outline"
          className="h-8 text-xs"
          onClick={onRemove}
        >
          Remove
        </Button>
      )}
    </div>
  );
}

export function CartPage() {
  const router = useRouter();
  const { items, hydrated, setQuantity, remove, clear } = useCart();
  const { cart, loading, error, refresh } = usePricedCart(items, 'collection', hydrated);

  if (!hydrated) {
    return (
      <div className="grid lg:grid-cols-[1fr_360px] gap-8">
        <div className="space-y-3">
          {[0, 1].map((i) => (
            <Skeleton key={i} className="h-28 rounded-lg" />
          ))}
        </div>
        <Skeleton className="h-48 rounded-lg" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-primary" />
          </div>
          <div className="space-y-1">
            <p className="text-lg font-medium">Your cart is empty</p>
            <p className="text-sm text-muted-foreground">
              Find something for your next game.
            </p>
          </div>
          <Link href="/store">
            <Button className="min-h-[44px]">
              Browse the store
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const localQty = (productId: string, variantId: string | null) =>
    items.find((l) => l.product_id === productId && (l.variant_id ?? null) === (variantId ?? null))
      ?.quantity ?? 0;

  const lines = (cart?.lines ?? []).filter((l) => localQty(l.product_id, l.variant_id) > 0);
  const problems = lines.filter((l) => l.problem).length;

  return (
    <div className="grid lg:grid-cols-[1fr_360px] gap-8 items-start">
      <div className="space-y-3">
        {error && (
          <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-orange-500/20 bg-orange-500/10 px-4 py-3 text-sm text-orange-400">
            <span>{error}</span>
            <div className="flex gap-2">
              <Button type="button" size="sm" variant="outline" className="min-h-[40px]" onClick={refresh}>
                Retry
              </Button>
              <Button type="button" size="sm" variant="outline" className="min-h-[40px]" onClick={clear}>
                Clear cart
              </Button>
            </div>
          </div>
        )}

        {!cart && !error ? (
          items.map((it) => (
            <Skeleton key={`${it.product_id}:${it.variant_id ?? ''}`} className="h-28 rounded-lg" />
          ))
        ) : !cart && error ? (
          // Pricing failed: still let the customer see and remove what is in the cart.
          <ul className="space-y-3">
            {items.map((it) => (
              <li key={`${it.product_id}:${it.variant_id ?? ''}`}>
                <Card className="rounded-lg">
                  <CardContent className="p-4 flex items-center justify-between gap-3 text-sm">
                    <span className="text-muted-foreground">
                      {it.quantity} × item (details unavailable right now)
                    </span>
                    <Button
                      type="button"
                      variant="ghost"
                      size="sm"
                      className="h-11 text-muted-foreground hover:text-destructive"
                      onClick={() => remove(it.product_id, it.variant_id)}
                    >
                      <Trash2 className="w-4 h-4 mr-1.5" />
                      Remove
                    </Button>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        ) : (
          <ul className="space-y-3">
            {lines.map((l) => {
              const qty = localQty(l.product_id, l.variant_id);
              // A sold-out or unavailable line can only be removed, never increased.
              const max = Math.max(1, l.available);
              const disabled = l.problem === 'inactive' || l.problem === 'out_of_stock';
              const name = l.product_slug ? (
                <Link
                  href={`/store/${l.product_slug}`}
                  className="font-medium hover:text-primary transition-colors"
                >
                  {l.product_name}
                </Link>
              ) : (
                <span className="font-medium">{l.product_name}</span>
              );
              return (
                <li key={`${l.product_id}:${l.variant_id ?? ''}`}>
                  <Card className={cn('rounded-lg', l.problem && 'border-orange-500/30')}>
                    <CardContent className="p-4 flex gap-4">
                      <div className="relative w-20 h-20 sm:w-24 sm:h-24 shrink-0 rounded-md overflow-hidden bg-secondary border border-border">
                        {l.image_url ? (
                          <Image
                            src={l.image_url}
                            alt={l.product_name}
                            fill
                            sizes="96px"
                            className={cn('object-cover', disabled && 'opacity-50')}
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/60">
                            <ShoppingBag className="w-6 h-6" />
                          </div>
                        )}
                      </div>

                      <div className="flex-1 min-w-0 flex flex-col">
                        <div className="flex items-start justify-between gap-3">
                          <div className="min-w-0">
                            <p className="leading-snug line-clamp-2">{name}</p>
                            {l.variant_name && (
                              <p className="text-sm text-muted-foreground">{l.variant_name}</p>
                            )}
                            {!disabled && (
                              <p className="text-xs text-muted-foreground tabular-nums mt-0.5">
                                {formatZar(l.unit_price_cents)} each
                              </p>
                            )}
                          </div>
                          <p
                            className={cn(
                              'font-semibold tabular-nums shrink-0 transition-opacity',
                              loading && 'opacity-60'
                            )}
                          >
                            {disabled ? '—' : formatZar(l.line_total_cents)}
                          </p>
                        </div>

                        <LineWarning
                          line={l}
                          onReduce={() => setQuantity(l.product_id, l.variant_id, l.available)}
                          onRemove={() => remove(l.product_id, l.variant_id)}
                        />

                        <div className="mt-auto pt-3 flex items-center justify-between gap-3">
                          <QuantityStepper
                            value={qty}
                            onChange={(n) => setQuantity(l.product_id, l.variant_id, n)}
                            max={max}
                            disabled={disabled}
                          />
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            className="h-10 text-muted-foreground hover:text-destructive"
                            onClick={() => remove(l.product_id, l.variant_id)}
                          >
                            <Trash2 className="w-4 h-4 mr-1.5" />
                            Remove
                          </Button>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                </li>
              );
            })}
          </ul>
        )}
      </div>

      <Card className="rounded-lg lg:sticky lg:top-24">
        <CardContent className="p-5 space-y-4">
          <h2 className="font-heading font-semibold text-lg">Summary</h2>
          <dl className="space-y-2 text-sm">
            <div className="flex justify-between gap-4">
              <dt className="text-muted-foreground">Subtotal</dt>
              <dd
                className={cn('font-semibold tabular-nums flex items-center gap-2', loading && 'opacity-60')}
              >
                {loading && <Loader2 className="w-3.5 h-3.5 animate-spin text-muted-foreground" />}
                {cart ? formatZar(cart.subtotal_cents) : '—'}
              </dd>
            </div>
          </dl>
          <p className="text-xs text-muted-foreground">
            Delivery fee is calculated at checkout. Collection is free.
          </p>
          {problems > 0 && (
            <p className="text-xs text-orange-400">
              Fix the {problems === 1 ? 'item' : `${problems} items`} flagged above to continue.
            </p>
          )}
          <Button
            type="button"
            size="lg"
            className="w-full min-h-[44px]"
            disabled={!cart?.ok || loading}
            onClick={() => router.push('/store/checkout')}
          >
            Checkout
            <ArrowRight className="w-4 h-4 ml-2" />
          </Button>
          <Link
            href="/store"
            className="block text-center text-sm text-muted-foreground hover:text-foreground transition-colors min-h-[44px] leading-[44px]"
          >
            Continue shopping
          </Link>
        </CardContent>
      </Card>
    </div>
  );
}
