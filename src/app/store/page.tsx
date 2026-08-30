import Link from 'next/link';
import { Search, Store } from 'lucide-react';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ProductGrid } from '@/components/store/product-grid';
import { getStoreSettings, listCategories, listProducts } from '@/lib/store/catalog';
import { cn } from '@/lib/utils';

export const metadata = {
  title: 'Store - KZN Chess',
  description: 'Chess sets, boards, clocks, books and KZN Chess merchandise.',
};
export const dynamic = 'force-dynamic';

function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? '';
}

export default async function StorePage({
  searchParams,
}: {
  searchParams: { category?: string | string[]; q?: string | string[] };
}) {
  const categorySlug = firstParam(searchParams.category);
  const q = firstParam(searchParams.q);

  const settings = await getStoreSettings();

  if (!settings.store_enabled) {
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Store className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <p className="text-lg font-medium">The store is currently closed</p>
              <p className="text-sm text-muted-foreground">
                Please check back soon.
              </p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  const [categories, products] = await Promise.all([
    listCategories(),
    listProducts({
      categorySlug: categorySlug || undefined,
      q: q || undefined,
    }),
  ]);

  const activeCategory = categories.find((c) => c.slug === categorySlug) ?? null;
  const filtering = Boolean(q || categorySlug);
  const chipHref = (slug?: string) => {
    const params = new URLSearchParams();
    if (slug) params.set('category', slug);
    if (q) params.set('q', q);
    const s = params.toString();
    return s ? `/store?${s}` : '/store';
  };

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-2">
            {settings.store_name}
          </h1>
          {settings.tagline && (
            <p className="text-muted-foreground max-w-2xl">{settings.tagline}</p>
          )}
        </div>

        <form method="get" action="/store" className="mb-6" role="search">
          {categorySlug && <input type="hidden" name="category" value={categorySlug} />}
          <div className="relative max-w-md">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground pointer-events-none" />
            <Input
              type="search"
              name="q"
              defaultValue={q}
              placeholder="Search products"
              aria-label="Search products"
              className="pl-9 h-11 bg-card"
            />
          </div>
        </form>

        {categories.length > 0 && (
          <div className="flex gap-2 overflow-x-auto pb-2 -mx-4 px-4 sm:mx-0 sm:px-0 sm:flex-wrap mb-8">
            {[{ id: 'all', name: 'All', slug: '' }, ...categories].map((c) => {
              const active = c.slug === '' ? !categorySlug : c.slug === categorySlug;
              return (
                <Link
                  key={c.id}
                  href={chipHref(c.slug || undefined)}
                  className={cn(
                    'shrink-0 inline-flex items-center px-4 min-h-[44px] rounded-full border text-sm font-medium transition-colors',
                    active
                      ? 'bg-primary/10 text-primary border-primary/20'
                      : 'border-border text-muted-foreground hover:text-foreground hover:bg-secondary'
                  )}
                >
                  {c.name}
                </Link>
              );
            })}
          </div>
        )}

        {filtering && (
          <div className="flex items-center justify-between gap-3 mb-4 text-sm text-muted-foreground">
            <p>
              {products.length} {products.length === 1 ? 'product' : 'products'}
              {activeCategory ? ` in ${activeCategory.name}` : ''}
              {q ? ` matching "${q}"` : ''}
            </p>
            <Button asChild variant="ghost" size="sm" className="min-h-[44px]">
              <Link href="/store">Clear</Link>
            </Button>
          </div>
        )}

        <ProductGrid
          products={products}
          emptyMessage={
            filtering ? 'No products match your search.' : 'No products yet — check back soon.'
          }
        />
      </div>
    </PageTransition>
  );
}
