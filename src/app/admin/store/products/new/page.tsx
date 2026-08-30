import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { ProductForm } from '@/components/admin/store/product-form';

export const metadata = {
  title: 'New product - Store - Admin - KZN Chess',
};

export default function AdminNewProductPage() {
  return (
    <div className="space-y-6">
      <div>
        <Link
          href="/admin/store/products"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
        >
          <ArrowLeft className="w-4 h-4" />
          Products
        </Link>
        <h1 className="text-2xl font-bold">New product</h1>
      </div>
      <ProductForm />
    </div>
  );
}
