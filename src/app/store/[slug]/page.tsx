import type { Metadata } from 'next';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, Store } from 'lucide-react';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent } from '@/components/ui/card';
import { ProductDetail } from '@/components/store/product-detail';
import { JsonLd } from '@/components/seo/json-ld';
import { getProductBySlug, getStoreSettings } from '@/lib/store/catalog';
import { formatZar } from '@/lib/store/money';
import { availableStock, fromPrice, hasVariants, primaryImage } from '@/lib/store/product-helpers';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';

type Props = { params: { slug: string } };

/** Image URLs are app-relative (`/api/media/...`) or absolute https — social
 * previews need a fully-qualified URL either way, so resolve against SITE_URL
 * explicitly rather than relying on Next's metadataBase resolution, which
 * doesn't reliably absolutize object-form `openGraph.images` entries. */
function toAbsoluteUrl(url: string): string {
  return url.startsWith('http') ? url : `${SITE_URL}${url}`;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const product = await getProductBySlug(params.slug);
  if (!product) return { title: 'Product not found - KZN Chess' };
  const description =
    product.description?.replace(/\s+/g, ' ').trim().slice(0, 160) ||
    `${product.name} — ${formatZar(fromPrice(product))} from the KZN Chess Store.`;
  const image = primaryImage(product);
  const absoluteImage = image ? toAbsoluteUrl(image) : null;
  const canonical = `/store/${product.slug}`;
  return {
    title: `${product.name} - KZN Chess Store`,
    description,
    alternates: { canonical },
    openGraph: {
      title: product.name,
      description,
      type: 'website',
      url: canonical,
      ...(absoluteImage
        ? { images: [{ url: absoluteImage, width: 1200, height: 1200, alt: product.name }] }
        : {}),
    },
    twitter: {
      card: 'summary_large_image',
      title: product.name,
      description,
      ...(absoluteImage ? { images: [absoluteImage] } : {}),
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

  const canonicalUrl = `${SITE_URL}/store/${product.slug}`;
  const image = primaryImage(product);
  const absoluteImage = image ? toAbsoluteUrl(image) : null;
  const inStock = availableStock(product) > 0;
  const sku = product.variants?.find((v) => v.sku)?.sku ?? undefined;

  const productJsonLd = {
    '@context': 'https://schema.org',
    '@type': 'Product',
    name: product.name,
    description: product.description?.replace(/\s+/g, ' ').trim() || undefined,
    ...(absoluteImage ? { image: [absoluteImage] } : {}),
    ...(sku ? { sku } : {}),
    ...(product.category ? { category: product.category.name } : {}),
    offers: {
      '@type': hasVariants(product) ? 'AggregateOffer' : 'Offer',
      url: canonicalUrl,
      priceCurrency: 'ZAR',
      price: (fromPrice(product) / 100).toFixed(2),
      availability: inStock
        ? 'https://schema.org/InStock'
        : 'https://schema.org/OutOfStock',
    },
  };

  return (
    <PageTransition>
      <JsonLd data={productJsonLd} />
      <JsonLd
        data={{
          '@context': 'https://schema.org',
          '@type': 'BreadcrumbList',
          itemListElement: [
            { '@type': 'ListItem', position: 1, name: 'Store', item: `${SITE_URL}/store` },
            ...(product.category
              ? [
                  {
                    '@type': 'ListItem',
                    position: 2,
                    name: product.category.name,
                    item: `${SITE_URL}/store?category=${encodeURIComponent(product.category.slug)}`,
                  },
                ]
              : []),
            {
              '@type': 'ListItem',
              position: product.category ? 3 : 2,
              name: product.name,
              item: canonicalUrl,
            },
          ],
        }}
      />
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/store"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors mb-6 min-h-[44px] sm:min-h-0"
        >
          <ArrowLeft className="w-4 h-4" />
          Store
        </Link>

        <div className="grid lg:grid-cols-2 gap-8 lg:gap-12">
          <ProductDetail product={product} />
        </div>
      </div>
    </PageTransition>
  );
}
