export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getOrderByNumber } from '@/lib/store/orders';

export async function GET(request: NextRequest, { params }: { params: { orderNumber: string } }) {
  const token = new URL(request.url).searchParams.get('token') || '';
  const order = await getOrderByNumber(params.orderNumber, token);
  if (!order) {
    return NextResponse.json({ error: 'Order not found' }, { status: 404 });
  }
  // Never echo the private token or internal admin notes back to the customer.
  const safe: Partial<typeof order> = { ...order };
  delete safe.access_token;
  delete safe.admin_note;
  return NextResponse.json(safe);
}
