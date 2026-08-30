import { ClipboardList } from 'lucide-react';
import { OrdersTable } from '@/components/admin/store/orders-table';

export const metadata = {
  title: 'Orders - Store - Admin - KZN Chess',
};

export default function AdminOrdersPage({
  searchParams,
}: {
  searchParams: { status?: string };
}) {
  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ClipboardList className="w-6 h-6 text-primary" />
          Orders
        </h1>
        <p className="text-muted-foreground mt-1">
          Confirm payments, pack, and dispatch or hand over orders.
        </p>
      </div>
      <OrdersTable initialStatus={searchParams.status} />
    </div>
  );
}
