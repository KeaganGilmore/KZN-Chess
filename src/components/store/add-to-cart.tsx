'use client';

import { useMemo, useState } from 'react';
import { Check, ShoppingCart } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { useToast } from '@/hooks/use-toast';
import { useCart } from './cart-provider';
import { QuantityStepper } from './quantity-stepper';
import type { Product } from '@/lib/store/types';
import {
  activeVariants,
  availableStock,
  defaultVariantId,
  hasVariants,
  unitPrice,
} from '@/lib/store/product-helpers';
import { formatZar } from '@/lib/store/money';
import { cn } from '@/lib/utils';

/**
 * `variantId`/`onVariantChange` are optional: pass both to let a parent (e.g.
 * a gallery that needs to know the selection too) control which variant is
 * picked; omit both to manage selection internally, standalone.
 */
export function AddToCart({
  product,
  variantId: controlledVariantId,
  onVariantChange,
}: {
  product: Product;
  variantId?: string | null;
  onVariantChange?: (variantId: string | null) => void;
}) {
  const { add, items } = useCart();
  const { toast } = useToast();
  const variants = activeVariants(product);
  const [internalVariantId, setInternalVariantId] = useState<string | null>(() =>
    defaultVariantId(product)
  );
  const controlled = onVariantChange !== undefined;
  const variantId = controlled ? (controlledVariantId ?? null) : internalVariantId;
  const setVariantId = controlled ? onVariantChange : setInternalVariantId;
  const [qty, setQty] = useState(1);
  const variant = variants.find((v) => v.id === variantId) ?? null;
  const needsVariant = hasVariants(product) && !variant;
  const stock = availableStock(product, variant);
  const inCart =
    items.find((l) => l.product_id === product.id && (l.variant_id ?? null) === variantId)
      ?.quantity ?? 0;
  const maxAdd = Math.max(0, stock - inCart);
  // The stepper can never show more than can actually be added.
  const shownQty = Math.max(1, Math.min(qty, Math.max(1, maxAdd)));
  const price = useMemo(() => unitPrice(product, variant), [product, variant]);
  const compareAt =
    product.compare_at_cents != null && product.compare_at_cents > price
      ? product.compare_at_cents
      : null;
  const [added, setAdded] = useState(false);

  const submit = () => {
    if (needsVariant) {
      toast({
        title: `Choose a ${variants[0].option_label.toLowerCase()}`,
        variant: 'destructive',
      });
      return;
    }
    if (maxAdd <= 0) {
      toast({ title: 'No more stock available', variant: 'destructive' });
      return;
    }
    add({ product_id: product.id, variant_id: variantId, quantity: Math.min(shownQty, maxAdd) });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
    toast({
      title: 'Added to cart',
      description: `${product.name}${variant ? ` (${variant.name})` : ''}`,
    });
  };

  let availability: string;
  if (needsVariant) availability = 'Select an option to see availability';
  else if (stock <= 0) availability = 'Sold out';
  else if (stock <= 5) availability = `Only ${stock} left`;
  else availability = 'In stock';

  return (
    <div className="space-y-5">
      <p className="flex items-baseline gap-3">
        <span className="text-3xl font-bold tabular-nums">{formatZar(price)}</span>
        {compareAt && (
          <span className="text-base text-muted-foreground line-through tabular-nums">
            {formatZar(compareAt)}
          </span>
        )}
      </p>

      {variants.length > 0 && (
        <div>
          <p className="text-sm font-medium mb-2">{variants[0].option_label}</p>
          <div className="flex flex-wrap gap-2">
            {variants.map((v) => (
              <button
                key={v.id}
                type="button"
                onClick={() => {
                  setVariantId(v.id);
                  setQty(1);
                }}
                disabled={v.stock_qty <= 0}
                aria-pressed={variantId === v.id}
                className={cn(
                  'px-3 py-2 rounded-md border text-sm min-h-[44px] transition-colors',
                  variantId === v.id
                    ? 'border-primary bg-primary/10 text-primary'
                    : 'border-border hover:border-primary/50',
                  v.stock_qty <= 0 && 'opacity-40 line-through cursor-not-allowed'
                )}
              >
                {v.name}
                {v.price_delta_cents
                  ? ` (${v.price_delta_cents > 0 ? '+' : '-'}${formatZar(Math.abs(v.price_delta_cents))})`
                  : ''}
              </button>
            ))}
          </div>
        </div>
      )}

      <p
        className={cn(
          'text-sm',
          !needsVariant && stock <= 0
            ? 'text-red-400'
            : !needsVariant && stock <= 5
              ? 'text-orange-400'
              : 'text-muted-foreground'
        )}
      >
        {availability}
      </p>

      <div className="flex items-center gap-3">
        <QuantityStepper value={shownQty} onChange={setQty} max={maxAdd} disabled={maxAdd <= 0} />
        <Button
          size="lg"
          className="flex-1 min-h-[44px]"
          onClick={submit}
          disabled={!needsVariant && maxAdd <= 0}
        >
          {added ? (
            <>
              <Check className="w-4 h-4 mr-2" /> Added
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4 mr-2" /> Add to cart
            </>
          )}
        </Button>
      </div>
      {inCart > 0 && (
        <p className="text-xs text-muted-foreground">
          {inCart} already in your cart
        </p>
      )}
    </div>
  );
}
