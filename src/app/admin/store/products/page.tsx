import { ShoppingBag } from 'lucide-react';
import { ProductsTable } from '@/components/admin/store/products-table';

export const metadata = {
  title: 'Products - Store - Admin - KZN Chess',
};

export default function AdminProductsPage() {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          Products
        </h1>
        <p className="text-muted-foreground mt-1">
          Everything you sell. Inactive products are hidden from customers but keep their data.
        </p>
      </div>
      <ProductsTable />
    </div>
  );
}
