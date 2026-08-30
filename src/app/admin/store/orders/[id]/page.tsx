import { notFound } from 'next/navigation';
import { OrderDetail } from '@/components/admin/store/order-detail';
import { getOrderById } from '@/lib/store/orders';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Order - Store - Admin - KZN Chess',
};

export default async function AdminOrderPage({ params }: { params: { id: string } }) {
  const order = await getOrderById(params.id);
  if (!order) notFound();
  return <OrderDetail order={order} />;
}
