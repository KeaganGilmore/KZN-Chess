export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getPaymentProvider } from '@/lib/store/payments';
import { getOrderById, setOrderStatus, updateOrderAdminFields } from '@/lib/store/orders';

export async function POST(request: NextRequest, { params }: { params: { provider: string } }) {
  const provider = getPaymentProvider(params.provider);
  if (!provider?.handleWebhook) {
    return NextResponse.json({ error: 'No webhook for this provider' }, { status: 404 });
  }

  try {
    const result = await provider.handleWebhook(request);
    const order = await getOrderById(result.order_id);
    if (!order) {
      return NextResponse.json({ error: 'Unknown order' }, { status: 404 });
    }
    if (result.reference) {
      await updateOrderAdminFields(order.id, { payment_reference: result.reference });
    }
    if (result.paid && order.status === 'awaiting_payment') {
      await setOrderStatus(order.id, 'paid', `Payment confirmed by ${provider.label}`, null);
    }
    return NextResponse.json({ ok: true });
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Webhook rejected' }, { status: 400 });
  }
}
