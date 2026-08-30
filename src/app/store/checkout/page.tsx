import { Store } from 'lucide-react';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent } from '@/components/ui/card';
import { CheckoutForm } from '@/components/store/checkout-form';
import { getCurrentUser } from '@/lib/auth';
import { getStoreSettings, listCollectionPoints } from '@/lib/store/catalog';
import { providerOptions } from '@/lib/store/payments';

export const metadata = {
  title: 'Checkout - KZN Chess',
  robots: { index: false, follow: false },
};
export const dynamic = 'force-dynamic';

export default async function CheckoutPage() {
  const settings = await getStoreSettings();

  if (!settings.store_enabled) {
    return (
      <PageTransition>
        <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
          <Card>
            <CardContent className="py-16 text-center space-y-3">
              <Store className="w-10 h-10 mx-auto text-muted-foreground/60" />
              <p className="text-lg font-medium">The store is currently closed</p>
              <p className="text-sm text-muted-foreground">Please check back soon.</p>
            </CardContent>
          </Card>
        </div>
      </PageTransition>
    );
  }

  const [collectionPoints, user] = await Promise.all([
    settings.collection_enabled ? listCollectionPoints() : Promise.resolve([]),
    getCurrentUser(),
  ]);

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="font-heading text-3xl sm:text-4xl font-bold tracking-tight mb-8">
          Checkout
        </h1>
        <CheckoutForm
          settings={{
            delivery_enabled: settings.delivery_enabled,
            collection_enabled: settings.collection_enabled,
            delivery_fee_cents: settings.delivery_fee_cents,
            free_delivery_threshold_cents: settings.free_delivery_threshold_cents,
            bank_details: settings.bank_details,
          }}
          collectionPoints={collectionPoints}
          providers={providerOptions(settings)}
          user={user ? { name: user.name, email: user.email } : null}
        />
      </div>
    </PageTransition>
  );
}
