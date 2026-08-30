import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Store } from 'lucide-react';
import { PageTransition } from '@/components/ui/page-transition';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent } from '@/components/ui/card';
import { ProductGallery } from '@/components/store/product-gallery';
import { AddToCart } from '@/components/store/add-to-cart';
import { getProductBySlug, getStoreSettings } from '@/lib/store/catalog';
import { formatZar } from '@/lib/store/money';
import { fromPrice, primaryImage } from '@/lib/store/product-helpers';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Product not found - KZN Chess' };
  const description =
    product.description?.replace(/\s+/g, ' ').trim().slice(0, 160) ||
    `${product.name} — ${formatZar(fromPrice(product))} from the KZN Chess Store.`;
  const image = primaryImage(product);
  return {
    title: `${product.name} - KZN Chess Store`,
    description,
    openGraph: {
      title: product.name,
      description,
      type: 'website',
      ...(image ? { images: [{ url: image }] } : {}),
    },
  };
}

export default async function ProductPage({ params }: Props) {
  const [settings, product] = await Promise.all([
    getStoreSettings(),
    getProductBySlug(params.slug),
  ]);
  if (!settings.store_enabled) {
    // Same honest "closed" state as /store, rather than a 404 on a shared product link.
    return (
      <PageTransition>
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Store className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <p className="text-lg font-medium">The store is currently closed</p>
              <p className="text-sm text-muted-foreground">Please check back soon.</p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }
  if (!product) notFound();

  const paragraphs = (product.description || '')
    .split(/\n{2,}/)
    .map((p) => p.trim())
    .filter(Boolean);

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/store"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 min-h-[44px] sm:min-h-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Store
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <ProductGallery images={product.images || []} name={product.name} />

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

            <AddToCart product={product} />

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
        </div>
      </div>
    </PageTransition>
  );
}
