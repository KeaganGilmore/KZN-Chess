export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { getCurrentUser } from '@/lib/auth';
import { listOrders } from '@/lib/store/orders';
import { ORDER_STATUSES } from '@/lib/store/status';
import type { OrderStatus } from '@/lib/store/types';

type StatusFilter = OrderStatus | 'open' | 'all';

const STATUS_FILTERS = new Set<string>([...ORDER_STATUSES, 'open', 'all']);

/** GET /api/admin/store/orders?status=open|all|<status>&q=search */
export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const sp = new URL(request.url).searchParams;
  const rawStatus = sp.get('status') || 'open';
  if (!STATUS_FILTERS.has(rawStatus)) {
    return NextResponse.json({ error: 'Invalid status filter' }, { status: 400 });
  }
  const q = sp.get('q') || undefined;

  return NextResponse.json(await listOrders({ status: rawStatus as StatusFilter, q }));
}
