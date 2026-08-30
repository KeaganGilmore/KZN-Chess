import Link from 'next/link';
import {
  AlertTriangle,
  ArrowRight,
  ClipboardList,
  Clock,
  Package,
  PackageCheck,
  Settings,
  ShoppingBag,
} from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { orderCounts } from '@/lib/store/orders';
import { getStoreSettings, listCollectionPoints, listProducts } from '@/lib/store/catalog';
import { availableStock } from '@/lib/store/product-helpers';

export const dynamic = 'force-dynamic';

export const metadata = {
  title: 'Store - Admin - KZN Chess',
};

const LOW_STOCK_THRESHOLD = 3;

export default async function AdminStorePage() {
  const [counts, products, settings, collectionPoints] = await Promise.all([
    orderCounts(),
    listProducts({ includeInactive: true }),
    getStoreSettings(),
    listCollectionPoints(true),
  ]);

  const lowStock = products
    .filter((p) => p.is_active && availableStock(p) <= LOW_STOCK_THRESHOLD)
    .sort((a, b) => availableStock(a) - availableStock(b));

  const stats = [
    {
      label: 'Awaiting payment',
      value: counts.awaiting_payment,
      icon: Clock,
      color: 'text-orange-400',
      href: '/admin/store/orders?status=awaiting_payment',
    },
    {
      label: 'To pack',
      value: counts.to_pack,
      icon: Package,
      color: 'text-blue-400',
      href: '/admin/store/orders?status=paid',
    },
    {
      label: 'To dispatch',
      value: counts.to_dispatch,
      icon: PackageCheck,
      color: 'text-purple-400',
      href: '/admin/store/orders?status=packed',
    },
    {
      label: 'Low stock',
      value: lowStock.length,
      icon: AlertTriangle,
      color: lowStock.length > 0 ? 'text-red-400' : 'text-green-400',
      href: '/admin/store/products',
    },
  ];

  const warnings: { text: string; href: string; cta: string }[] = [];
  if (!settings.store_enabled) {
    warnings.push({
      text: 'Store is closed — customers can’t check out.',
      href: '/admin/store/settings',
      cta: 'Open store',
    });
  }
  if (!settings.bank_details) {
    warnings.push({
      text: 'Add bank details so EFT customers know where to pay.',
      href: '/admin/store/settings',
      cta: 'Add bank details',
    });
  }
  if (settings.collection_enabled && collectionPoints.length === 0) {
    warnings.push({
      text: settings.delivery_enabled
        ? 'Collection is enabled but there are no active collection points — customers only see delivery.'
        : 'Collection is enabled but there are no active collection points, and delivery is off — nobody can check out.',
      href: '/admin/store/settings',
      cta: 'Add a collection point',
    });
  }
  if (!settings.collection_enabled && !settings.delivery_enabled) {
    warnings.push({
      text: 'Both delivery and collection are switched off — nobody can check out.',
      href: '/admin/store/settings',
      cta: 'Fix fulfilment',
    });
  }

  const quickLinks = [
    {
      href: '/admin/store/products',
      label: 'Products',
      description: `${products.length} product${products.length === 1 ? '' : 's'} (${products.filter((p) => p.is_active).length} active)`,
      icon: ShoppingBag,
    },
    {
      href: '/admin/store/orders',
      label: 'Orders',
      description: 'Manage open orders, payments and fulfilment',
      icon: ClipboardList,
    },
    {
      href: '/admin/store/settings',
      label: 'Settings',
      description: 'Store, delivery, collection points and categories',
      icon: Settings,
    },
  ];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold flex items-center gap-2">
          <ShoppingBag className="w-6 h-6 text-primary" />
          Store
        </h1>
        <p className="text-muted-foreground mt-1">
          {settings.store_name}
          {settings.tagline ? ` — ${settings.tagline}` : ''}
        </p>
      </div>

      {warnings.length > 0 && (
        <div className="space-y-2">
          {warnings.map((w) => (
            <div
              key={w.text}
              className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 rounded-lg border border-orange-500/30 bg-orange-500/10 px-4 py-3 text-sm"
            >
              <div className="flex items-center gap-2 text-orange-300">
                <AlertTriangle className="w-4 h-4 shrink-0" />
                {w.text}
              </div>
              <Button asChild size="sm" variant="outline" className="shrink-0">
                <Link href={w.href}>{w.cta}</Link>
              </Button>
            </div>
          ))}
        </div>
      )}

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {stats.map((stat) => (
          <Link key={stat.label} href={stat.href}>
            <Card className="hover:border-primary/50 transition-colors h-full">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <stat.icon className={`w-5 h-5 ${stat.color}`} />
                  <span className="text-2xl font-bold">{stat.value}</span>
                </div>
                <p className="text-sm text-muted-foreground mt-2">{stat.label}</p>
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader>
            <CardTitle className="text-base">Low stock</CardTitle>
          </CardHeader>
          <CardContent>
            {lowStock.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                {products.length === 0
                  ? 'No products yet.'
                  : `Every active product has more than ${LOW_STOCK_THRESHOLD} in stock.`}
              </p>
            ) : (
              <ul className="divide-y divide-border">
                {lowStock.slice(0, 8).map((p) => {
                  const stock = availableStock(p);
                  return (
                    <li key={p.id} className="flex items-center justify-between py-2 text-sm">
                      <Link
                        href={`/admin/store/products/${p.id}`}
                        className="font-medium hover:text-primary truncate"
                      >
                        {p.name}
                      </Link>
                      <span className={stock === 0 ? 'text-red-400' : 'text-orange-400'}>
                        {stock === 0 ? 'Out of stock' : `${stock} left`}
                      </span>
                    </li>
                  );
                })}
              </ul>
            )}
          </CardContent>
        </Card>

        <div className="space-y-3">
          {quickLinks.map((q) => (
            <Link key={q.href} href={q.href}>
              <Card className="hover:border-primary/50 transition-colors">
                <CardContent className="pt-5 flex items-center gap-3">
                  <q.icon className="w-5 h-5 text-primary shrink-0" />
                  <div className="min-w-0 flex-1">
                    <p className="font-medium">{q.label}</p>
                    <p className="text-xs text-muted-foreground truncate">{q.description}</p>
                  </div>
                  <ArrowRight className="w-4 h-4 text-muted-foreground shrink-0" />
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </div>
  );
}
