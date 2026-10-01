'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Ban, CheckCircle2, Loader2, PackageCheck, Search, X } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
} from '@/components/ui/select';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import { OrderStatusBadge } from '@/components/store/order-status-badge';
import type { Order, OrderStatus, PaymentStatus } from '@/lib/store/types';
import { ORDER_STATUSES, ORDER_STATUS_LABELS, isOpenOrder } from '@/lib/store/status';
import { formatZar } from '@/lib/store/money';
import { cn } from '@/lib/utils';

type StatusFilter = 'open' | 'all' | OrderStatus;

const FILTERS: StatusFilter[] = ['open', ...ORDER_STATUSES, 'all'];

function filterLabel(f: StatusFilter): string {
  if (f === 'open') return 'Open';
  if (f === 'all') return 'All';
  return ORDER_STATUS_LABELS[f];
}

const PAYMENT_STATUSES: PaymentStatus[] = ['pending', 'paid', 'failed', 'refunded'];

const PAYMENT_STYLES: Record<PaymentStatus, string> = {
  pending: 'text-orange-400',
  paid: 'text-green-400',
  failed: 'text-red-400',
  refunded: 'text-muted-foreground',
};

/** A status change waiting on confirmation because it moves stock. */
interface PendingChange {
  ids: string[];
  status: OrderStatus;
}

export function OrdersTable({ initialStatus }: { initialStatus?: string }) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [counts, setCounts] = useState<Record<OrderStatus, number> | null>(null);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<StatusFilter>(
    FILTERS.includes(initialStatus as StatusFilter) ? (initialStatus as StatusFilter) : 'open'
  );
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [busyIds, setBusyIds] = useState<Set<string>>(new Set());
  const [pending, setPending] = useState<PendingChange | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchOrders = useCallback(async () => {
    setRefreshing(true);
    try {
      const [listRes, countRes] = await Promise.all([
        fetch(`/api/admin/store/orders?status=${status}&q=${encodeURIComponent(query)}`),
        fetch('/api/admin/store/orders?counts=1'),
      ]);
      if (!listRes.ok) throw new Error();
      setOrders(await listRes.json());
      if (countRes.ok) setCounts(await countRes.json());
    } catch {
      toast({ title: 'Failed to load orders', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [status, query, toast]);

  useEffect(() => {
    fetchOrders();
  }, [fetchOrders]);

  // Selection only makes sense within the current view.
  useEffect(() => setSelected(new Set()), [status, query]);

  const patchOrder = async (id: string, body: Record<string, unknown>) => {
    const res = await fetch(`/api/admin/store/orders/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Update failed');
  };

  /** Applies a change to each order in turn and reports how many succeeded. */
  const applyToOrders = async (ids: string[], body: Record<string, unknown>, label: string) => {
    setBusyIds(new Set(ids));
    const failures: string[] = [];
    for (const id of ids) {
      try {
        await patchOrder(id, body);
      } catch (err: any) {
        const num = orders.find((o) => o.id === id)?.order_number ?? id;
        failures.push(`${num}: ${err.message}`);
      }
    }
    setBusyIds(new Set());
    setSelected(new Set());
    const done = ids.length - failures.length;
    if (done > 0) {
      toast({ title: ids.length === 1 ? label : `${done} of ${ids.length} orders ${label.toLowerCase()}` });
    }
    if (failures.length > 0) {
      toast({ title: 'Some orders were not updated', description: failures.join('\n'), variant: 'destructive' });
    }
    await fetchOrders();
  };

  const changeStatus = (ids: string[], target: OrderStatus) => {
    // Cancelling returns stock and reinstating takes it again, so confirm those.
    const movesStock =
      target === 'cancelled' ||
      ids.some((id) => orders.find((o) => o.id === id)?.status === 'cancelled');
    if (movesStock) {
      setPending({ ids, status: target });
      return;
    }
    return applyToOrders(ids, { status: target, override: true }, `Marked ${ORDER_STATUS_LABELS[target].toLowerCase()}`);
  };

  const changePayment = (id: string, payment_status: PaymentStatus) =>
    applyToOrders([id], { payment_status }, `Payment marked ${payment_status}`);

  const toggle = (id: string) =>
    setSelected((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });

  const allSelected = orders.length > 0 && orders.every((o) => selected.has(o.id));
  const selectedIds = [...selected];
  const openCount = counts
    ? ORDER_STATUSES.filter(isOpenOrder).reduce((n, s) => n + counts[s], 0)
    : null;
  const countFor = (f: StatusFilter): number | null => {
    if (!counts) return null;
    if (f === 'open') return openCount;
    if (f === 'all') return ORDER_STATUSES.reduce((n, s) => n + counts[s], 0);
    return counts[f];
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2" role="tablist" aria-label="Order views">
        {FILTERS.map((f) => {
          const n = countFor(f);
          const active = status === f;
          return (
            <button
              key={f}
              type="button"
              role="tab"
              aria-selected={active}
              onClick={() => setStatus(f)}
              className={cn(
                'inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors',
                active
                  ? 'border-primary bg-primary/10 text-foreground'
                  : 'border-border text-muted-foreground hover:text-foreground hover:border-primary/50'
              )}
            >
              {filterLabel(f)}
              {n !== null && (
                <span
                  className={cn(
                    'rounded-full px-1.5 text-xs tabular-nums',
                    active ? 'bg-primary text-primary-foreground' : 'bg-secondary'
                  )}
                >
                  {n}
                </span>
              )}
            </button>
          );
        })}
      </div>

      <div className="relative">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search by order number, name, email or phone..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
        {refreshing && (
          <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
        )}
      </div>

      {selected.size > 0 && (
        <div className="flex flex-wrap items-center gap-2 rounded-lg border border-primary/40 bg-primary/5 px-3 py-2">
          <span className="text-sm font-medium mr-2">{selected.size} selected</span>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={busyIds.size > 0}
            onClick={() => changeStatus(selectedIds, 'paid')}
          >
            <CheckCircle2 className="w-4 h-4" /> Mark paid
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5"
            disabled={busyIds.size > 0}
            onClick={() => changeStatus(selectedIds, 'completed')}
          >
            <PackageCheck className="w-4 h-4" /> Mark fulfilled
          </Button>
          <Button
            size="sm"
            variant="outline"
            className="gap-1.5 text-destructive hover:text-destructive"
            disabled={busyIds.size > 0}
            onClick={() => changeStatus(selectedIds, 'cancelled')}
          >
            <Ban className="w-4 h-4" /> Cancel
          </Button>
          <Button
            size="sm"
            variant="ghost"
            className="gap-1.5 ml-auto"
            onClick={() => setSelected(new Set())}
          >
            <X className="w-4 h-4" /> Clear
          </Button>
        </div>
      )}

      {orders.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {query
              ? 'No orders match your search.'
              : status === 'open'
                ? 'No open orders.'
                : status === 'all'
                  ? 'No orders yet.'
                  : `No orders with status "${ORDER_STATUS_LABELS[status]}".`}
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-10">
                  <input
                    type="checkbox"
                    className="h-4 w-4 accent-primary align-middle"
                    checked={allSelected}
                    onChange={() =>
                      setSelected(allSelected ? new Set() : new Set(orders.map((o) => o.id)))
                    }
                    aria-label="Select all orders"
                  />
                </TableHead>
                <TableHead>Order</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden md:table-cell">Delivery / collection</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => {
                const busy = busyIds.has(o.id);
                return (
                  <TableRow key={o.id} data-state={selected.has(o.id) ? 'selected' : undefined}>
                    <TableCell>
                      <input
                        type="checkbox"
                        className="h-4 w-4 accent-primary align-middle"
                        checked={selected.has(o.id)}
                        onChange={() => toggle(o.id)}
                        aria-label={`Select order ${o.order_number}`}
                      />
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/store/orders/${o.id}`}
                        className="font-medium font-mono text-sm hover:text-primary"
                      >
                        {o.order_number}
                      </Link>
                      <p className="text-xs text-muted-foreground md:hidden">
                        {format(new Date(o.created_at), 'd MMM yyyy')}
                      </p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground whitespace-nowrap">
                      {format(new Date(o.created_at), 'd MMM yyyy, HH:mm')}
                    </TableCell>
                    <TableCell>
                      <p className="text-sm font-medium">{o.customer_name}</p>
                      <p className="text-xs text-muted-foreground truncate max-w-[180px]">{o.customer_email}</p>
                      <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground max-w-[220px]">
                      {o.fulfilment === 'delivery' ? (
                        <>
                          <p className="font-medium text-foreground">Delivery</p>
                          {o.delivery_address ? (
                            <p className="text-xs leading-snug">
                              {[
                                o.delivery_address.line1,
                                o.delivery_address.line2,
                                o.delivery_address.suburb,
                                [o.delivery_address.city, o.delivery_address.postal_code].filter(Boolean).join(' '),
                                o.delivery_address.province,
                              ]
                                .filter(Boolean)
                                .join(', ')}
                            </p>
                          ) : (
                            <p className="text-xs">No address on record</p>
                          )}
                        </>
                      ) : (
                        `Collect: ${o.collection_point_name || 'collection point'}`
                      )}
                    </TableCell>
                    <TableCell className="text-sm font-medium whitespace-nowrap">
                      {formatZar(o.total_cents)}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={o.status}
                        disabled={busy}
                        onValueChange={(v) => changeStatus([o.id], v as OrderStatus)}
                      >
                        <SelectTrigger
                          className="h-8 w-auto gap-1 border-none bg-transparent p-0 shadow-none focus:ring-0"
                          aria-label={`Status of order ${o.order_number}`}
                        >
                          {busy ? (
                            <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />
                          ) : (
                            <OrderStatusBadge status={o.status} />
                          )}
                        </SelectTrigger>
                        <SelectContent>
                          {ORDER_STATUSES.map((s) => (
                            <SelectItem key={s} value={s}>
                              {ORDER_STATUS_LABELS[s]}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Select
                        value={o.payment_status}
                        disabled={busy}
                        onValueChange={(v) => changePayment(o.id, v as PaymentStatus)}
                      >
                        <SelectTrigger
                          className={cn(
                            'h-8 w-auto gap-1 border-none bg-transparent p-0 shadow-none focus:ring-0 text-xs font-medium capitalize',
                            PAYMENT_STYLES[o.payment_status]
                          )}
                          aria-label={`Payment status of order ${o.order_number}`}
                        >
                          {o.payment_status}
                        </SelectTrigger>
                        <SelectContent>
                          {PAYMENT_STATUSES.map((p) => (
                            <SelectItem key={p} value={p} className="capitalize">
                              {p}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={pending !== null}
        onOpenChange={(o) => !o && setPending(null)}
        title={
          pending?.status === 'cancelled'
            ? `Cancel ${pending.ids.length === 1 ? 'this order' : `${pending.ids.length} orders`}?`
            : 'Reinstate cancelled orders?'
        }
        description={
          pending?.status === 'cancelled'
            ? 'Stock for every item is returned to inventory. Customers are not notified automatically.'
            : 'Stock for every item is reserved again. This fails for any order whose items have sold out.'
        }
        confirmLabel={pending?.status === 'cancelled' ? 'Cancel orders' : 'Reinstate'}
        destructive={pending?.status === 'cancelled'}
        onConfirm={async () => {
          if (!pending) return;
          const { ids, status: target } = pending;
          setPending(null);
          await applyToOrders(ids, { status: target, override: true }, `Marked ${ORDER_STATUS_LABELS[target].toLowerCase()}`);
        }}
      />
    </div>
  );
}
