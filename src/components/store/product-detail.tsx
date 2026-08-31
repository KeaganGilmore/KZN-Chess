'use client';

import { useState } from 'react';
import Link from 'next/link';
import { Badge } from '@/components/ui/badge';
import { ProductGallery } from './product-gallery';
import { AddToCart } from './add-to-cart';
import type { Product } from '@/lib/store/types';
import { activeVariants, defaultVariantId, imagesForVariant } from '@/lib/store/product-helpers';

/**
 * The whole two-column product view (gallery + name/price/buy box). Owns the
 * selected variant so the gallery swaps photos the moment the shopper picks
 * a different variant — the gallery and the buy box are siblings that both
 * need that selection, so it's lifted here rather than living in either.
 * Renders as a Fragment so its two top-level elements become the direct
 * grid children the page's `grid lg:grid-cols-2` layout expects.
 */
export function ProductDetail({ product }: { product: Product }) {
  const [variantId, setVariantId] = useState<string | null>(() => defaultVariantId(product));
  const variant = activeVariants(product).find((v) => v.id === variantId) ?? null;
  const images = imagesForVariant(product, variant);
  const paragraphs = (product.description || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <>
      {/* key: remount on variant change so the gallery always opens on that
          variant's first photo, instead of keeping whatever index was
          selected for the previous variant. */}
      <ProductGallery key={variantId ?? 'none'} images={images} name={product.name} />

      <div className="space-y-6">
        <div className="space-y-3">
          {product.category && (
            <Link href={`/store?category=${encodeURIComponent(product.category.slug)}`}>
              <Badge
                variant="outline"
                className="bg-primary/10 text-primary border-primary/20 hover:bg-primary/20 transition-colors"
              >
                {product.category.name}
              </Badge>
            </Link>
          )}
          <h1 className="font-heading text-2xl sm:text-3xl lg:text-4xl font-bold tracking-tight">
            {product.name}
          </h1>
        </div>

        <AddToCart product={product} variantId={variantId} onVariantChange={setVariantId} />

        {paragraphs.length > 0 && (
          <div className="border-t border-border pt-6 space-y-3 text-sm sm:text-base text-muted-foreground leading-relaxed">
            {paragraphs.map((p, i) => (
              <p key={i} className="whitespace-pre-line">
                {p}
              </p>
            ))}
          </div>
        )}
      </div>
    </>
  );
}
