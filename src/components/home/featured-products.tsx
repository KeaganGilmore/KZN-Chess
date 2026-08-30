import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import type { Product } from '@/lib/store/types';
import { ProductGrid } from '@/components/store/product-grid';

/**
 * Featured products on the homepage; `fallback` means nothing is flagged as
 * featured yet and these are simply the newest products. Renders nothing
 * when there are none.
 */
export function FeaturedProducts({
  products,
  fallback = false,
}: {
  products: Product[];
  fallback?: boolean;
}) {
  if (products.length === 0) return null;
  return (
    <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
      <div className="flex items-end justify-between gap-4 mb-6">
        <div>
          <h2 className="font-heading text-2xl sm:text-3xl font-bold">
            {fallback ? (
              <>
                New in the <span className="text-primary">store</span>
              </>
            ) : (
              <>
                Featured <span className="text-primary">gear</span>
              </>
            )}
          </h2>
          <p className="text-sm text-muted-foreground mt-1">
            {fallback
              ? 'The latest additions to the KZN Chess store.'
              : 'Boards, sets, clocks and books picked for KZN players.'}
          </p>
        </div>
        <Link
          href="/store"
          className="inline-flex items-center gap-1.5 text-sm font-medium text-primary hover:underline shrink-0 min-h-[44px]"
        >
          View all <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
      <ProductGrid products={products} />
    </section>
  );
}
