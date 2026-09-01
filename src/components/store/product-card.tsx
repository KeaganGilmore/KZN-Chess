import Link from 'next/link';
import Image from 'next/image';
import { ShoppingBag } from 'lucide-react';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import type { Product } from '@/lib/store/types';
import { formatZar } from '@/lib/store/money';
import { fromPrice, hasVariants, inStock, primaryImage, primaryImageAlt } from '@/lib/store/product-helpers';
import { cn } from '@/lib/utils';

export function ProductCard({ product }: { product: Product }) {
  const image = primaryImage(product);
  const price = fromPrice(product);
  const soldOut = !inStock(product);
  const onSale = product.compare_at_cents != null && product.compare_at_cents > price;

  return (
    <Link href={`/store/${product.slug}`} className="block group h-full">
      <Card className="h-full overflow-hidden rounded-lg hover:border-primary/50 transition-colors">
        <div className="relative aspect-square bg-secondary">
          {image ? (
            <Image
              src={image}
              alt={primaryImageAlt(product)}
              fill
              sizes="(max-width: 640px) 50vw, (max-width: 1024px) 33vw, 25vw"
              className={cn(
                'object-cover transition-transform duration-300 group-hover:scale-[1.03]',
                soldOut && 'opacity-60'
              )}
            />
          ) : (
            <div className="absolute inset-0 flex items-center justify-center text-muted-foreground/60">
              <ShoppingBag className="w-10 h-10" />
            </div>
          )}
          <div className="absolute top-2 left-2 flex flex-col gap-1.5">
            {soldOut && (
              <Badge variant="outline" className="bg-red-500/10 text-red-400 border-red-500/20 backdrop-blur-sm">
                Sold out
              </Badge>
            )}
            {!soldOut && product.is_featured && (
              <Badge variant="outline" className="bg-primary/10 text-primary border-primary/20 backdrop-blur-sm">
                Featured
              </Badge>
            )}
          </div>
        </div>
        <div className="p-3 sm:p-4 space-y-1.5">
          {product.category?.name && (
            <p className="text-[11px] uppercase tracking-wide text-muted-foreground truncate">
              {product.category.name}
            </p>
          )}
          <h3 className="font-medium text-sm sm:text-base leading-snug line-clamp-2 group-hover:text-primary transition-colors">
            {product.name}
          </h3>
          <p className="flex items-baseline gap-2 flex-wrap">
            <span className="font-semibold tabular-nums">
              {hasVariants(product) ? `From ${formatZar(price)}` : formatZar(price)}
            </span>
            {onSale && (
              <span className="text-xs text-muted-foreground line-through tabular-nums">
                {formatZar(product.compare_at_cents as number)}
              </span>
            )}
          </p>
        </div>
      </Card>
    </Link>
  );
}
