'use client';

import { useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import {
  ArrowLeft,
  ImageIcon,
  Loader2,
  Mail,
  MessageCircle,
  Phone,
  Save,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { OrderStatusBadge } from '@/components/store/order-status-badge';
import type { OrderStatus, OrderWithItems } from '@/lib/store/types';
import { ORDER_STATUS_LABELS, nextStatuses } from '@/lib/store/status';
import { formatZar } from '@/lib/store/money';
import { customerWhatsAppUrl } from '@/lib/store/whatsapp';
import { getPaymentProvider } from '@/lib/store/payments';

const PAYMENT_STYLES: Record<OrderWithItems['payment_status'], string> = {
  pending: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  paid: 'bg-green-500/10 text-green-400 border-green-500/20',
  failed: 'bg-red-500/10 text-red-400 border-red-500/20',
  refunded: 'bg-secondary text-muted-foreground',
};

function when(iso: string): string {
  return format(new Date(iso), 'd MMM yyyy, HH:mm');
}

export function OrderDetail({ order: initial }: { order: OrderWithItems }) {
  const { toast } = useToast();
  const router = useRouter();
  const [order, setOrder] = useState<OrderWithItems>(initial);
  const [note, setNote] = useState('');
  const [changing, setChanging] = useState<OrderStatus | null>(null);
  const [confirming, setConfirming] = useState<OrderStatus | null>(null);
  const [paymentRef, setPaymentRef] = useState(initial.payment_reference ?? '');
  const [adminNote, setAdminNote] = useState(initial.admin_note ?? '');
  const [savingRef, setSavingRef] = useState(false);
  const [savingNote, setSavingNote] = useState(false);

  const patch = async (body: Record<string, unknown>): Promise<OrderWithItems> => {
    const res = await fetch(`/api/admin/store/orders/${order.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data as OrderWithItems;
  };

  const changeStatus = async (status: OrderStatus) => {
    setChanging(status);
    try {
      const updated = await patch({ status, note: note.trim() || null });
      setOrder(updated);
      setNote('');
      toast({ title: `Order marked as ${ORDER_STATUS_LABELS[status].toLowerCase()}` });
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to update status', variant: 'destructive' });
    } finally {
      setChanging(null);
    }
  };

  const savePaymentRef = async () => {
    setSavingRef(true);
    try {
      const updated = await patch({ payment_reference: paymentRef.trim() || null });
      setOrder(updated);
      toast({ title: 'Payment reference saved' });
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to save reference', variant: 'destructive' });
    } finally {
      setSavingRef(false);
    }
  };

  const saveAdminNote = async () => {
    setSavingNote(true);
    try {
      const updated = await patch({ admin_note: adminNote.trim() || null });
      setOrder(updated);
      toast({ title: 'Note saved' });
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to save note', variant: 'destructive' });
    } finally {
      setSavingNote(false);
    }
  };

  const transitions = nextStatuses(order.status, order.fulfilment);
  const needsConfirm = (s: OrderStatus) => s === 'cancelled' || order.status === 'cancelled';
  const provider = getPaymentProvider(order.payment_provider);
  const address = order.delivery_address;

  const confirmCopy =
    confirming === 'cancelled'
      ? {
          title: 'Cancel this order?',
          description:
            'Stock for every item will be returned to inventory. The customer is not notified automatically — contact them if needed.',
          confirmLabel: 'Cancel order',
        }
      : {
          title: 'Reinstate this order?',
          description:
            'Stock for every item will be reserved again. This fails if any item has sold out since the order was cancelled.',
          confirmLabel: 'Reinstate order',
        };

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-start justify-between gap-4">
        <div>
          <Link
            href="/admin/store/orders"
            className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4" />
            Orders
          </Link>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-2xl font-bold font-mono">{order.order_number}</h1>
            <OrderStatusBadge status={order.status} />
          </div>
          <p className="text-sm text-muted-foreground mt-1">
            Placed <time suppressHydrationWarning>{when(order.created_at)}</time>
            {order.user_id ? ' · registered customer' : ' · guest checkout'}
          </p>
        </div>
        <p className="text-2xl font-bold sm:text-right">{formatZar(order.total_cents)}</p>
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Items</CardTitle>
            </CardHeader>
            <CardContent>
              <ul className="divide-y divide-border">
                {order.items.map((item) => (
                  <li key={item.id} className="flex items-center gap-3 py-3">
                    {item.image_url ? (
                      <Image
                        src={item.image_url}
                        alt={item.product_name}
                        width={48}
                        height={48}
                        unoptimized
                        className="w-12 h-12 rounded-md object-cover border border-border shrink-0"
                      />
                    ) : (
                      <div className="w-12 h-12 rounded-md border border-border bg-secondary flex items-center justify-center shrink-0">
                        <ImageIcon className="w-4 h-4 text-muted-foreground" />
                      </div>
                    )}
                    <div className="flex-1 min-w-0">
                      <p className="font-medium truncate">
                        {item.product_id ? (
                          <Link
                            href={`/admin/store/products/${item.product_id}`}
                            className="hover:text-primary"
                          >
                            {item.product_name}
                          </Link>
                        ) : (
                          item.product_name
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {item.variant_name ? `${item.variant_name} · ` : ''}
                        {item.quantity} × {formatZar(item.unit_price_cents)}
                      </p>
                    </div>
                    <p className="text-sm font-medium whitespace-nowrap">
                      {formatZar(item.line_total_cents)}
                    </p>
                  </li>
                ))}
              </ul>
              <div className="mt-4 pt-4 border-t border-border space-y-1 text-sm">
                <div className="flex justify-between text-muted-foreground">
                  <span>Subtotal</span>
                  <span>{formatZar(order.subtotal_cents)}</span>
                </div>
                <div className="flex justify-between text-muted-foreground">
                  <span>Delivery</span>
                  <span>
                    {order.fulfilment === 'delivery' ? formatZar(order.delivery_fee_cents) : 'Collection (free)'}
                  </span>
                </div>
                <div className="flex justify-between font-semibold text-base pt-1">
                  <span>Total</span>
                  <span>{formatZar(order.total_cents)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Timeline</CardTitle>
            </CardHeader>
            <CardContent>
              {order.events.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events recorded.</p>
              ) : (
                <ol className="space-y-4">
                  {order.events.map((ev) => (
                    <li key={ev.id} className="flex gap-3">
                      <div className="mt-1.5 w-2 h-2 rounded-full bg-primary shrink-0" />
                      <div className="min-w-0">
                        <p className="text-sm">
                          {ev.from_status ? (
                            <>
                              <span className="text-muted-foreground">
                                {ORDER_STATUS_LABELS[ev.from_status]}
                              </span>
                              <span className="text-muted-foreground"> → </span>
                            </>
                          ) : null}
                          <span className="font-medium">{ORDER_STATUS_LABELS[ev.to_status]}</span>
                        </p>
                        {ev.note && <p className="text-sm text-muted-foreground">{ev.note}</p>}
                        <p className="text-xs text-muted-foreground mt-0.5">
                          <time suppressHydrationWarning>{when(ev.created_at)}</time>
                        </p>
                      </div>
                    </li>
                  ))}
                </ol>
              )}
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Actions</CardTitle>
              {transitions.length === 0 && (
                <CardDescription>This order is complete. No further changes.</CardDescription>
              )}
            </CardHeader>
            {transitions.length > 0 && (
              <CardContent className="space-y-3">
                <div className="space-y-2">
                  <Label htmlFor="status-note">Note (optional)</Label>
                  <Input
                    id="status-note"
                    value={note}
                    onChange={(e) => setNote(e.target.value)}
                    placeholder="e.g. Courier tracking number"
                    maxLength={500}
                  />
                </div>
                <div className="flex flex-col gap-2">
                  {transitions.map((s) => {
                    const busy = changing === s;
                    const destructive = s === 'cancelled';
                    const label =
                      order.status === 'cancelled'
                        ? 'Reinstate order'
                        : `Mark as ${ORDER_STATUS_LABELS[s].toLowerCase()}`;
                    return (
                      <Button
                        key={s}
                        variant={destructive ? 'destructive' : 'default'}
                        disabled={changing !== null}
                        className="gap-2 justify-center"
                        onClick={() => (needsConfirm(s) ? setConfirming(s) : changeStatus(s))}
                      >
                        {busy && <Loader2 className="w-4 h-4 animate-spin" />}
                        {label}
                      </Button>
                    );
                  })}
                </div>
              </CardContent>
            )}
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Customer</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <p className="font-medium">{order.customer_name}</p>
              <a
                href={`mailto:${order.customer_email}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground break-all"
              >
                <Mail className="w-4 h-4 shrink-0" />
                {order.customer_email}
              </a>
              <a
                href={`tel:${order.customer_phone}`}
                className="flex items-center gap-2 text-muted-foreground hover:text-foreground"
              >
                <Phone className="w-4 h-4 shrink-0" />
                {order.customer_phone}
              </a>
              <Button asChild variant="outline" size="sm" className="gap-2 w-full">
                <a href={customerWhatsAppUrl(order)} target="_blank" rel="noopener noreferrer">
                  <MessageCircle className="w-4 h-4" />
                  Message on WhatsApp
                </a>
              </Button>
              {order.customer_note && (
                <div className="rounded-md bg-secondary/60 px-3 py-2">
                  <p className="text-xs text-muted-foreground mb-0.5">Customer note</p>
                  <p className="whitespace-pre-wrap">{order.customer_note}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">
                {order.fulfilment === 'delivery' ? 'Delivery' : 'Collection'}
              </CardTitle>
            </CardHeader>
            <CardContent className="text-sm">
              {order.fulfilment === 'delivery' ? (
                address ? (
                  <address className="not-italic space-y-0.5">
                    <p>{address.line1}</p>
                    {address.line2 && <p>{address.line2}</p>}
                    {address.suburb && <p>{address.suburb}</p>}
                    <p>
                      {address.city}, {address.postal_code}
                    </p>
                    <p>{address.province}</p>
                  </address>
                ) : (
                  <p className="text-muted-foreground">No address on record.</p>
                )
              ) : (
                <p>{order.collection_point_name || 'Collection point no longer on record.'}</p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Payment</CardTitle>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Method</span>
                <span className="text-right">{provider?.label ?? order.payment_provider}</span>
              </div>
              <div className="flex items-center justify-between gap-2">
                <span className="text-muted-foreground">Status</span>
                <Badge variant="outline" className={`capitalize ${PAYMENT_STYLES[order.payment_status]}`}>
                  {order.payment_status}
                </Badge>
              </div>
              {order.paid_at && (
                <div className="flex items-center justify-between gap-2">
                  <span className="text-muted-foreground">Paid</span>
                  <time suppressHydrationWarning>{when(order.paid_at)}</time>
                </div>
              )}
              <div className="space-y-2 pt-1">
                <Label htmlFor="payment-ref">Payment reference</Label>
                <div className="flex gap-2">
                  <Input
                    id="payment-ref"
                    value={paymentRef}
                    onChange={(e) => setPaymentRef(e.target.value)}
                    placeholder="e.g. EFT reference or receipt no."
                    maxLength={120}
                  />
                  <Button
                    size="icon"
                    variant="outline"
                    onClick={savePaymentRef}
                    disabled={savingRef || paymentRef.trim() === (order.payment_reference ?? '')}
                    aria-label="Save payment reference"
                  >
                    {savingRef ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
                  </Button>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Admin note</CardTitle>
              <CardDescription>Internal only — never shown to the customer.</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              <Textarea
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                rows={3}
                maxLength={2000}
              />
              <Button
                size="sm"
                variant="outline"
                className="gap-2"
                onClick={saveAdminNote}
                disabled={savingNote || adminNote.trim() === (order.admin_note ?? '')}
              >
                {savingNote && <Loader2 className="w-4 h-4 animate-spin" />}
                Save note
              </Button>
            </CardContent>
          </Card>
        </div>
      </div>

      <ConfirmDialog
        open={confirming !== null}
        onOpenChange={(o) => !o && setConfirming(null)}
        title={confirmCopy.title}
        description={confirmCopy.description}
        confirmLabel={confirmCopy.confirmLabel}
        destructive={confirming === 'cancelled'}
        onConfirm={async () => {
          if (confirming) await changeStatus(confirming);
        }}
      />
    </div>
  );
}
