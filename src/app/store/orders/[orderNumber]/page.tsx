import Link from 'next/link';
import { format } from 'date-fns';
import { ArrowRight, MapPin, MessageCircle, SearchX, Truck, User } from 'lucide-react';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/store/order-status-badge';
import { OrderSummary } from '@/components/store/order-summary';
import { PaymentInstructions } from '@/components/store/payment-instructions';
import { getOrderByNumber } from '@/lib/store/orders';
import { getCollectionPoint, getStoreSettings } from '@/lib/store/catalog';
import { getPaymentProvider } from '@/lib/store/payments';
import { ORDER_STATUS_HELP, ORDER_STATUS_LABELS } from '@/lib/store/status';
import { orderWhatsAppUrl } from '@/lib/store/whatsapp';
import { SITE_URL } from '@/lib/site';

export const dynamic = 'force-dynamic';
export const metadata = {
  title: 'Your order - KZN Chess',
  robots: { index: false, follow: false },
};

function firstParam(v: string | string[] | undefined): string {
  return (Array.isArray(v) ? v[0] : v)?.trim() ?? '';
}

export default async function OrderPage({
  params,
  searchParams,
}: {
  params: { orderNumber: string };
  searchParams: { token?: string | string[] };
}) {
  const token = firstParam(searchParams.token);
  const order = await getOrderByNumber(params.orderNumber, token);
  if (!order) {
    // Honest state instead of a generic 404: the usual cause is a bookmarked
    // or forwarded link that lost its ?token= query.
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <SearchX className="w-6 h-6 text-primary" />
              </div>
              <div className="space-y-1">
                <p className="text-lg font-medium">We couldn&apos;t find that order</p>
                <p className="text-sm text-muted-foreground max-w-md mx-auto">
                  Open the private link from your order confirmation (it includes a security
                  token), or sign in and use My Orders if you ordered with an account.
                </p>
              </div>
              <div className="flex flex-col sm:flex-row gap-3 justify-center">
                <Button asChild variant="outline" className="min-h-[44px]">
                  <Link href="/my-orders">My Orders</Link>
                </Button>
                <Button asChild className="min-h-[44px]">
                  <Link href="/store">
                    Back to store
                    <ArrowRight className="w-4 h-4 ml-2" />
                  </Link>
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  const settings = await getStoreSettings();
  const [collectionPoint, payment] = await Promise.all([
    order.fulfilment === 'collection' && order.collection_point_id
      ? getCollectionPoint(order.collection_point_id)
      : Promise.resolve(null),
    order.status === 'awaiting_payment'
      ? getPaymentProvider(order.payment_provider)?.createPayment(order, settings) ??
        Promise.resolve(null)
      : Promise.resolve(null),
  ]);

  const orderUrl = `${SITE_URL}/store/orders/${encodeURIComponent(order.order_number)}?token=${encodeURIComponent(token)}`;
  const whatsapp = orderWhatsAppUrl(order, settings, orderUrl);
  const address = order.delivery_address;

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 space-y-3">
          <div className="flex flex-wrap items-center gap-3">
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight">
              Order <span className="text-primary">{order.order_number}</span>
            </h1>
            <OrderStatusBadge status={order.status} className="text-sm" />
          </div>
          <p className="text-muted-foreground">{ORDER_STATUS_HELP[order.status]}</p>
          <p className="text-xs text-muted-foreground">
            Placed {format(new Date(order.created_at), 'd MMM yyyy')}. Keep this link
            &mdash; it&apos;s the only way to view this order without an account.
          </p>
        </div>

        <div className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
          <div className="space-y-6">
            {payment && <PaymentInstructions payment={payment} />}

            <Card className="rounded-lg">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  {order.fulfilment === 'delivery' ? (
                    <Truck className="w-4 h-4 text-primary" />
                  ) : (
                    <MapPin className="w-4 h-4 text-primary" />
                  )}
                </div>
                <CardTitle className="font-heading">
                  {order.fulfilment === 'delivery' ? 'Delivery to' : 'Collect at'}
                </CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                {order.fulfilment === 'delivery' && address ? (
                  <>
                    <p>{address.line1}</p>
                    {address.line2 && <p>{address.line2}</p>}
                    {address.suburb && <p>{address.suburb}</p>}
                    <p>
                      {address.city}, {address.postal_code}
                    </p>
                    <p>{address.province}</p>
                  </>
                ) : (
                  <>
                    <p className="font-medium">
                      {order.collection_point_name || collectionPoint?.name || 'Collection point'}
                    </p>
                    {collectionPoint?.address && (
                      <p className="text-muted-foreground">{collectionPoint.address}</p>
                    )}
                    {collectionPoint?.instructions && (
                      <p className="text-muted-foreground whitespace-pre-line pt-1">
                        {collectionPoint.instructions}
                      </p>
                    )}
                  </>
                )}
              </CardContent>
            </Card>

            <Card className="rounded-lg">
              <CardHeader className="flex flex-row items-center gap-3 space-y-0">
                <div className="w-9 h-9 rounded-lg bg-primary/10 flex items-center justify-center shrink-0">
                  <User className="w-4 h-4 text-primary" />
                </div>
                <CardTitle className="font-heading">Your details</CardTitle>
              </CardHeader>
              <CardContent className="text-sm space-y-1">
                <p>{order.customer_name}</p>
                <p className="text-muted-foreground">{order.customer_email}</p>
                <p className="text-muted-foreground">{order.customer_phone}</p>
                {order.customer_note && (
                  <p className="pt-2 whitespace-pre-line">
                    <span className="text-muted-foreground">Note: </span>
                    {order.customer_note}
                  </p>
                )}
              </CardContent>
            </Card>

            {order.events.length > 0 && (
              <Card className="rounded-lg">
                <CardHeader>
                  <CardTitle className="font-heading">Timeline</CardTitle>
                </CardHeader>
                <CardContent>
                  <ol className="relative border-l border-border ml-2 space-y-4">
                    {order.events.map((ev, i) => (
                      <li key={ev.id} className="pl-5">
                        <span
                          className={
                            'absolute -left-[5px] mt-1.5 w-[9px] h-[9px] rounded-full ' +
                            (i === order.events.length - 1 ? 'bg-primary' : 'bg-muted-foreground/40')
                          }
                        />
                        <p className="text-sm font-medium">{ORDER_STATUS_LABELS[ev.to_status]}</p>
                        {ev.note && <p className="text-xs text-muted-foreground">{ev.note}</p>}
                        <p className="text-xs text-muted-foreground">
                          {format(new Date(ev.created_at), 'd MMM yyyy')}
                        </p>
                      </li>
                    ))}
                  </ol>
                </CardContent>
              </Card>
            )}
          </div>

          <div className="space-y-4 lg:sticky lg:top-24">
            <Card className="rounded-lg">
              <CardHeader>
                <CardTitle className="font-heading">Items</CardTitle>
              </CardHeader>
              <CardContent>
                <OrderSummary
                  lines={order.items}
                  subtotal_cents={order.subtotal_cents}
                  delivery_fee_cents={order.delivery_fee_cents}
                  total_cents={order.total_cents}
                  fulfilment={order.fulfilment}
                />
              </CardContent>
            </Card>

            <div className="flex flex-col gap-3">
              {whatsapp && (
                <Button asChild className="min-h-[44px] w-full">
                  <a href={whatsapp} target="_blank" rel="noopener noreferrer">
                    <MessageCircle className="w-4 h-4 mr-2" />
                    Send order via WhatsApp
                  </a>
                </Button>
              )}
              <Link href="/store" className="w-full">
                <Button variant="outline" className="min-h-[44px] w-full">
                  Continue shopping
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
