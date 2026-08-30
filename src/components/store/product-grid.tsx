import { PackageOpen } from 'lucide-react';
import type { Product } from '@/lib/store/types';
import { ProductCard } from './product-card';

export function ProductGrid({
  products,
  emptyMessage = 'No products yet — check back soon.',
}: {
  products: Product[];
  emptyMessage?: string;
}) {
  if (products.length === 0) {
    return (
      <div className="rounded-lg border border-dashed border-border py-16 text-center">
        <PackageOpen className="w-8 h-8 mx-auto mb-3 text-muted-foreground/60" />
        <p className="text-muted-foreground">{emptyMessage}</p>
      </div>
    );
  }
  return (
    <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
      {products.map((p) => (
        <ProductCard key={p.id} product={p} />
      ))}
    </div>
  );
}
