import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft, ExternalLink } from 'lucide-react';
import { ProductForm } from '@/components/admin/store/product-form';
import { getProductById } from '@/lib/store/catalog';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Edit product - Store - Admin - KZN Chess',
};

export default async function AdminEditProductPage({ params }: { params: { id: string } }) {
  const product = await getProductById(params.id);
  if (!product) notFound();

  return (
    <div className="space-y-6">
      <div className="flex items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/store/products"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Products
          </Link>
          <h1 className="text-2xl font-bold">{product.name}</h1>
        </div>
        {product.is_active && (
          <Link
            href={`/store/${product.slug}`}
            target="_blank"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground shrink-0"
          >
            View in store
            <ExternalLink className="w-3.5 h-3.5" />
          </Link>
        )}
      </div>
      <ProductForm product={product} />
    </div>
  );
}
