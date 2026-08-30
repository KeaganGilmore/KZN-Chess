import Link from 'next/link';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { ArrowRight, MapPin, Package, Truck } from 'lucide-react';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { OrderStatusBadge } from '@/components/store/order-status-badge';
import { getCurrentUser } from '@/lib/auth';
import { listOrdersForUser } from '@/lib/store/orders';
import { formatZar } from '@/lib/store/money';

export const metadata = {
  title: 'My Orders - KZN Chess',
  description: 'Orders you have placed in the KZN Chess Store.',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function MyOrdersPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth');

  const orders = await listOrdersForUser(user.id);

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-2">
              My <span className="text-primary">Orders</span>
            </h1>
            <p className="text-muted-foreground">
              Orders placed with this account. Each one has a private link you can share.
            </p>
          </div>
          <Link href="/store">
            <Button variant="outline" className="min-h-[44px]">
              Back to store
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        {orders.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center space-y-4">
              <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
                <Package className="w-6 h-6 text-primary" />
              </div>
              <p className="text-lg font-medium">You haven&apos;t ordered anything yet.</p>
              <Link href="/store">
                <Button className="min-h-[44px]">
                  Browse the store
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <ul className="space-y-3">
            {orders.map((o) => (
              <li key={o.id}>
                <Card className="rounded-lg hover:border-primary/30 transition-colors">
                  <CardContent className="py-4 flex flex-wrap items-center justify-between gap-4">
                    <div className="min-w-0 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <p className="font-heading font-semibold">{o.order_number}</p>
                        <OrderStatusBadge status={o.status} />
                      </div>
                      <p className="text-sm text-muted-foreground flex flex-wrap items-center gap-x-3 gap-y-1">
                        <span>{format(new Date(o.created_at), 'd MMM yyyy')}</span>
                        <span className="inline-flex items-center gap-1">
                          {o.fulfilment === 'delivery' ? (
                            <>
                              <Truck className="w-3.5 h-3.5" /> Delivery
                            </>
                          ) : (
                            <>
                              <MapPin className="w-3.5 h-3.5" />
                              {o.collection_point_name
                                ? `Collect at ${o.collection_point_name}`
                                : 'Collection'}
                            </>
                          )}
                        </span>
                      </p>
                    </div>
                    <div className="flex items-center gap-4">
                      <p className="font-semibold tabular-nums">{formatZar(o.total_cents)}</p>
                      <Link
                        href={`/store/orders/${encodeURIComponent(o.order_number)}?token=${encodeURIComponent(o.access_token)}`}
                      >
                        <Button variant="outline" size="sm" className="min-h-[44px] sm:min-h-0">
                          View
                          <ArrowRight className="w-4 h-4 ml-1.5" />
                        </Button>
                      </Link>
                    </div>
                  </CardContent>
                </Card>
              </li>
            ))}
          </ul>
        )}
      </div>
    </PageTransition>
  );
}
