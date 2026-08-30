'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import { format } from 'date-fns';
import { Loader2, Search } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Card, CardContent } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
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
import type { Order, OrderStatus } from '@/lib/store/types';
import { ORDER_STATUSES, ORDER_STATUS_LABELS } from '@/lib/store/status';
import { formatZar } from '@/lib/store/money';

type StatusFilter = 'open' | 'all' | OrderStatus;

const FILTERS: StatusFilter[] = ['open', ...ORDER_STATUSES, 'all'];

function filterLabel(f: StatusFilter): string {
  if (f === 'open') return 'Open orders';
  if (f === 'all') return 'All orders';
  return ORDER_STATUS_LABELS[f];
}

const PAYMENT_STYLES: Record<Order['payment_status'], string> = {
  pending: 'text-orange-400',
  paid: 'text-green-400',
  failed: 'text-red-400',
  refunded: 'text-muted-foreground',
};

export function OrdersTable({ initialStatus }: { initialStatus?: string }) {
  const { toast } = useToast();
  const [orders, setOrders] = useState<Order[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [status, setStatus] = useState<StatusFilter>(
    FILTERS.includes(initialStatus as StatusFilter) ? (initialStatus as StatusFilter) : 'open'
  );
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchOrders = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(
        `/api/admin/store/orders?status=${status}&q=${encodeURIComponent(query)}`
      );
      if (!res.ok) throw new Error();
      setOrders(await res.json());
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

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
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
        <Select value={status} onValueChange={(v) => setStatus(v as StatusFilter)}>
          <SelectTrigger className="w-full sm:w-[200px]">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            {FILTERS.map((f) => (
              <SelectItem key={f} value={f}>
                {filterLabel(f)}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

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
                <TableHead>Order</TableHead>
                <TableHead className="hidden md:table-cell">Date</TableHead>
                <TableHead>Customer</TableHead>
                <TableHead className="hidden lg:table-cell">Fulfilment</TableHead>
                <TableHead>Total</TableHead>
                <TableHead>Status</TableHead>
                <TableHead className="hidden sm:table-cell">Payment</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {orders.map((o) => (
                <TableRow key={o.id}>
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
                    <p className="text-xs text-muted-foreground">{o.customer_phone}</p>
                  </TableCell>
                  <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                    {o.fulfilment === 'delivery'
                      ? 'Delivery'
                      : `Collect: ${o.collection_point_name || 'collection point'}`}
                  </TableCell>
                  <TableCell className="text-sm font-medium whitespace-nowrap">
                    {formatZar(o.total_cents)}
                  </TableCell>
                  <TableCell>
                    <OrderStatusBadge status={o.status} />
                  </TableCell>
                  <TableCell className="hidden sm:table-cell">
                    <span className={`text-xs font-medium capitalize ${PAYMENT_STYLES[o.payment_status]}`}>
                      {o.payment_status}
                    </span>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        </div>
      )}
    </div>
  );
}
