export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { orderStatusSchema, orderAdminSchema } from '@/lib/store/validation';
import {
  OrderUpdateError,
  deleteOrder,
  getOrderById,
  setOrderStatus,
  updateOrderAdminFields,
} from '@/lib/store/orders';
import { nextStatuses } from '@/lib/store/status';

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const order = await getOrderById(params.id);
  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(order);
}

/**
 * PATCH { status, note?, override? } moves the order along its lifecycle
 * (validated against nextStatuses unless override is set); any other body is
 * treated as admin fields (see orderAdminSchema).
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => null);
  if (!body || typeof body !== 'object') {
    return NextResponse.json({ error: 'Invalid body' }, { status: 400 });
  }

  const order = await getOrderById(params.id);
  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  const supabase = createServerClient();

  if ('status' in body) {
    const parsed = orderStatusSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid status', issues: parsed.error.issues }, { status: 400 });
    }
    const target = parsed.data.status;
    if (!parsed.data.override && !nextStatuses(order.status, order.fulfilment).includes(target)) {
      return NextResponse.json(
        { error: `Cannot move from ${order.status} to ${target}` },
        { status: 400 }
      );
    }
    try {
      await setOrderStatus(order.id, target, parsed.data.note || null, user.id);
    } catch (err: any) {
      // set_order_status raises when reinstating a cancelled order whose stock is gone.
      return NextResponse.json({ error: err?.message || 'Status change failed' }, { status: 409 });
    }
    await supabase.from('audit_logs').insert({
      admin_id: user.id,
      admin_email: user.email,
      action: 'store_order_status_changed',
      entity_type: 'order',
      entity_id: order.id,
      details: {
        from: order.status,
        to: target,
        note: parsed.data.note || null,
        override: !!parsed.data.override,
      },
    });
  } else {
    const parsed = orderAdminSchema.safeParse(body);
    if (!parsed.success) {
      return NextResponse.json({ error: 'Invalid fields', issues: parsed.error.issues }, { status: 400 });
    }
    if (Object.keys(parsed.data).length === 0) {
      return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
    }
    try {
      await updateOrderAdminFields(order, parsed.data);
    } catch (err: any) {
      const status = err instanceof OrderUpdateError ? 400 : 500;
      return NextResponse.json({ error: err?.message || 'Update failed' }, { status });
    }
    await supabase.from('audit_logs').insert({
      admin_id: user.id,
      admin_email: user.email,
      action: 'store_order_updated',
      entity_type: 'order',
      entity_id: order.id,
      details: parsed.data,
    });
  }

  return NextResponse.json(await getOrderById(order.id));
}

/** DELETE removes a cancelled order for good; open orders must be cancelled first. */
export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const order = await getOrderById(params.id);
  if (!order) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  if (order.status !== 'cancelled') {
    return NextResponse.json(
      { error: 'Cancel the order first so its stock is returned, then delete it' },
      { status: 400 }
    );
  }
  try {
    await deleteOrder(order.id);
  } catch (err: any) {
    return NextResponse.json({ error: err?.message || 'Delete failed' }, { status: 500 });
  }
  await createServerClient().from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'store_order_deleted',
    entity_type: 'order',
    entity_id: order.id,
    details: {
      order_number: order.order_number,
      customer_email: order.customer_email,
      total_cents: order.total_cents,
    },
  });
  return NextResponse.json({ success: true });
}
