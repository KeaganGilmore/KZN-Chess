'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2, MapPin, ShoppingBag, Truck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Skeleton } from '@/components/ui/skeleton';
import { useToast } from '@/hooks/use-toast';
import type { CollectionPoint, Fulfilment, StoreSettings } from '@/lib/store/types';
import type { ProviderOption } from '@/lib/store/payments';
import { formatZar } from '@/lib/store/money';
import { cn } from '@/lib/utils';
import { useCart } from './cart-provider';
import { usePricedCart } from './use-priced-cart';
import { OrderSummary } from './order-summary';

type CheckoutSettings = Pick<
  StoreSettings,
  | 'delivery_enabled'
  | 'collection_enabled'
  | 'delivery_fee_cents'
  | 'free_delivery_threshold_cents'
  | 'bank_details'
>;

interface Props {
  settings: CheckoutSettings;
  collectionPoints: CollectionPoint[];
  providers: ProviderOption[];
  user: { name: string; email: string } | null;
}

const PROVINCES = [
  'KwaZulu-Natal',
  'Eastern Cape',
  'Free State',
  'Gauteng',
  'Limpopo',
  'Mpumalanga',
  'Northern Cape',
  'North West',
  'Western Cape',
];

const FIELD_LABELS: Record<string, string> = {
  'customer.name': 'Enter your full name',
  'customer.email': 'Enter a valid email address',
  'customer.phone': 'Enter a valid phone number',
  'delivery_address.line1': 'Enter your street address',
  'delivery_address.city': 'Enter your city or town',
  'delivery_address.postal_code': 'Enter a valid postal code',
  'delivery_address.province': 'Choose a province',
  collection_point_id: 'Choose a collection point',
  payment_provider: 'Choose a payment method',
};

const selectClass =
  'flex h-11 w-full rounded-md border border-input bg-transparent px-3 py-1 text-base shadow-sm focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-ring md:text-sm';

function FieldError({ message }: { message?: string }) {
  if (!message) return null;
  return <p className="text-xs text-destructive mt-1">{message}</p>;
}

export function CheckoutForm({ settings, collectionPoints, providers, user }: Props) {
  const router = useRouter();
  const { toast } = useToast();
  const { items, hydrated, clear } = useCart();

  const collectionAvailable = settings.collection_enabled && collectionPoints.length > 0;
  const deliveryAvailable = settings.delivery_enabled;
  const initialFulfilment: Fulfilment = collectionAvailable ? 'collection' : 'delivery';

  const [customer, setCustomer] = useState({
    name: user?.name ?? '',
    email: user?.email ?? '',
    phone: '',
  });
  const [fulfilment, setFulfilment] = useState<Fulfilment>(initialFulfilment);
  const [address, setAddress] = useState({
    line1: '',
    line2: '',
    suburb: '',
    city: '',
    postal_code: '',
    province: 'KwaZulu-Natal',
  });
  const [collectionPointId, setCollectionPointId] = useState<string>(
    collectionPoints[0]?.id ?? ''
  );
  const [providerId, setProviderId] = useState<string>(providers[0]?.id ?? '');
  const [note, setNote] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [placed, setPlaced] = useState(false);
  const [errors, setErrors] = useState<Record<string, string>>({});

  const { cart, loading, error: priceError, refresh } = usePricedCart(items, fulfilment, hydrated);

  const chosenPoint = useMemo(
    () => collectionPoints.find((p) => p.id === collectionPointId) ?? null,
    [collectionPoints, collectionPointId]
  );

  const canCheckout = (deliveryAvailable || collectionAvailable) && providers.length > 0;

  const setField = (key: string, value: string) => {
    if (errors[key]) {
      setErrors((prev) => {
        const next = { ...prev };
        delete next[key];
        return next;
      });
    }
    if (key.startsWith('customer.')) {
      setCustomer((c) => ({ ...c, [key.slice('customer.'.length)]: value }));
    } else if (key.startsWith('delivery_address.')) {
      setAddress((a) => ({ ...a, [key.slice('delivery_address.'.length)]: value }));
    }
  };

  const validate = (): Record<string, string> => {
    const e: Record<string, string> = {};
    if (customer.name.trim().length < 2) e['customer.name'] = FIELD_LABELS['customer.name'];
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customer.email.trim()))
      e['customer.email'] = FIELD_LABELS['customer.email'];
    if (customer.phone.replace(/\D/g, '').length < 8)
      e['customer.phone'] = FIELD_LABELS['customer.phone'];
    if (fulfilment === 'delivery') {
      if (address.line1.trim().length < 3)
        e['delivery_address.line1'] = FIELD_LABELS['delivery_address.line1'];
      if (address.city.trim().length < 2)
        e['delivery_address.city'] = FIELD_LABELS['delivery_address.city'];
      if (address.postal_code.trim().length < 4)
        e['delivery_address.postal_code'] = FIELD_LABELS['delivery_address.postal_code'];
      if (!address.province) e['delivery_address.province'] = FIELD_LABELS['delivery_address.province'];
    } else if (!collectionPointId) {
      e.collection_point_id = FIELD_LABELS.collection_point_id;
    }
    if (!providerId) e.payment_provider = FIELD_LABELS.payment_provider;
    return e;
  };

  const submit = async (ev: React.FormEvent) => {
    ev.preventDefault();
    if (!cart?.ok || submitting) return;
    const clientErrors = validate();
    if (Object.keys(clientErrors).length) {
      setErrors(clientErrors);
      toast({ title: 'Please check the highlighted fields', variant: 'destructive' });
      return;
    }
    setSubmitting(true);
    try {
      const res = await fetch('/api/store/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          items,
          customer: {
            name: customer.name.trim(),
            email: customer.email.trim(),
            phone: customer.phone.trim(),
          },
          fulfilment,
          delivery_address:
            fulfilment === 'delivery'
              ? {
                  line1: address.line1.trim(),
                  line2: address.line2.trim() || null,
                  suburb: address.suburb.trim() || null,
                  city: address.city.trim(),
                  postal_code: address.postal_code.trim(),
                  province: address.province,
                }
              : null,
          collection_point_id: fulfilment === 'collection' ? collectionPointId : null,
          payment_provider: providerId,
          note: note.trim() || null,
        }),
      });
      const data = await res.json().catch(() => ({}));

      if (res.status === 201 && data.order_number && data.access_token) {
        setPlaced(true);
        clear();
        router.push(
          `/store/orders/${encodeURIComponent(data.order_number)}?token=${encodeURIComponent(data.access_token)}`
        );
        return;
      }
      if (res.status === 400 && Array.isArray(data.issues)) {
        const next: Record<string, string> = {};
        for (const issue of data.issues as { path: (string | number)[]; message: string }[]) {
          const key = (issue.path || []).join('.');
          next[key] = FIELD_LABELS[key] ?? issue.message;
        }
        setErrors(next);
        toast({ title: 'Please check the highlighted fields', variant: 'destructive' });
        return;
      }
      if (res.status === 409) {
        toast({
          title: data.error || 'Your cart has changed',
          description: 'We have refreshed prices and stock — please review your order.',
          variant: 'destructive',
        });
        refresh();
        return;
      }
      toast({
        title: data.error || 'Could not place your order',
        description: 'Please try again in a moment.',
        variant: 'destructive',
      });
    } catch {
      toast({ title: 'Network error', description: 'Please check your connection and try again.', variant: 'destructive' });
    } finally {
      setSubmitting(false);
    }
  };

  if (placed) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-3">
          <Loader2 className="w-6 h-6 mx-auto animate-spin text-primary" />
          <p className="font-medium">Order placed — taking you to your order…</p>
        </CardContent>
      </Card>
    );
  }

  if (!hydrated) {
    return (
      <div className="grid lg:grid-cols-[1fr_380px] gap-8">
        <div className="space-y-4">
          <Skeleton className="h-48 rounded-lg" />
          <Skeleton className="h-40 rounded-lg" />
        </div>
        <Skeleton className="h-64 rounded-lg" />
      </div>
    );
  }

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-4">
          <div className="w-14 h-14 mx-auto rounded-full bg-primary/10 flex items-center justify-center">
            <ShoppingBag className="w-6 h-6 text-primary" />
          </div>
          <p className="text-lg font-medium">Your cart is empty</p>
          <Link href="/store">
            <Button className="min-h-[44px]">
              Browse the store
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  if (!canCheckout) {
    return (
      <Card>
        <CardContent className="py-16 text-center space-y-3">
          <p className="text-lg font-medium">Checkout is unavailable right now</p>
          <p className="text-sm text-muted-foreground">
            {providers.length === 0
              ? 'No payment method is available yet.'
              : 'Neither delivery nor collection is available at the moment.'}{' '}
            Please try again later.
          </p>
          <Link href="/store/cart" className="inline-block">
            <Button variant="outline" className="min-h-[44px]">
              Back to cart
            </Button>
          </Link>
        </CardContent>
      </Card>
    );
  }

  const freeDeliveryNote =
    settings.free_delivery_threshold_cents != null
      ? `Free on orders over ${formatZar(settings.free_delivery_threshold_cents)}`
      : null;

  return (
    <form onSubmit={submit} noValidate className="grid lg:grid-cols-[1fr_380px] gap-8 items-start">
      <div className="space-y-6">
        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Your details</CardTitle>
          </CardHeader>
          <CardContent className="grid sm:grid-cols-2 gap-4">
            <div className="sm:col-span-2">
              <Label htmlFor="name">Full name</Label>
              <Input
                id="name"
                name="name"
                autoComplete="name"
                className="mt-1.5 h-11"
                value={customer.name}
                onChange={(e) => setField('customer.name', e.target.value)}
                aria-invalid={Boolean(errors['customer.name'])}
              />
              <FieldError message={errors['customer.name']} />
            </div>
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                name="email"
                type="email"
                inputMode="email"
                autoComplete="email"
                className="mt-1.5 h-11"
                value={customer.email}
                onChange={(e) => setField('customer.email', e.target.value)}
                aria-invalid={Boolean(errors['customer.email'])}
              />
              <FieldError message={errors['customer.email']} />
            </div>
            <div>
              <Label htmlFor="phone">Phone</Label>
              <Input
                id="phone"
                name="phone"
                type="tel"
                inputMode="tel"
                autoComplete="tel"
                placeholder="082 123 4567"
                className="mt-1.5 h-11"
                value={customer.phone}
                onChange={(e) => setField('customer.phone', e.target.value)}
                aria-invalid={Boolean(errors['customer.phone'])}
              />
              <FieldError message={errors['customer.phone']} />
            </div>
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="font-heading text-lg">How would you like to receive it?</CardTitle>
          </CardHeader>
          <CardContent className="space-y-5">
            <div
              role="radiogroup"
              aria-label="Fulfilment"
              className={cn(
                'grid gap-3',
                deliveryAvailable && collectionAvailable ? 'sm:grid-cols-2' : 'grid-cols-1'
              )}
            >
              {deliveryAvailable && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={fulfilment === 'delivery'}
                  onClick={() => setFulfilment('delivery')}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-4 text-left min-h-[44px] transition-colors',
                    fulfilment === 'delivery'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <Truck
                    className={cn('w-5 h-5 mt-0.5 shrink-0', fulfilment === 'delivery' ? 'text-primary' : 'text-muted-foreground')}
                  />
                  <span>
                    <span className="block font-medium">Delivery</span>
                    <span className="block text-xs text-muted-foreground">
                      {settings.delivery_fee_cents === 0
                        ? 'Free courier delivery'
                        : `${formatZar(settings.delivery_fee_cents)} courier fee`}
                      {freeDeliveryNote && settings.delivery_fee_cents > 0 ? ` · ${freeDeliveryNote}` : ''}
                    </span>
                  </span>
                </button>
              )}
              {collectionAvailable && (
                <button
                  type="button"
                  role="radio"
                  aria-checked={fulfilment === 'collection'}
                  onClick={() => setFulfilment('collection')}
                  className={cn(
                    'flex items-start gap-3 rounded-lg border p-4 text-left min-h-[44px] transition-colors',
                    fulfilment === 'collection'
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <MapPin
                    className={cn('w-5 h-5 mt-0.5 shrink-0', fulfilment === 'collection' ? 'text-primary' : 'text-muted-foreground')}
                  />
                  <span>
                    <span className="block font-medium">Collection</span>
                    <span className="block text-xs text-muted-foreground">
                      Free — pick up at a venue or tournament
                    </span>
                  </span>
                </button>
              )}
            </div>

            {fulfilment === 'delivery' && (
              <div className="grid sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2">
                  <Label htmlFor="line1">Street address</Label>
                  <Input
                    id="line1"
                    autoComplete="address-line1"
                    className="mt-1.5 h-11"
                    value={address.line1}
                    onChange={(e) => setField('delivery_address.line1', e.target.value)}
                    aria-invalid={Boolean(errors['delivery_address.line1'])}
                  />
                  <FieldError message={errors['delivery_address.line1']} />
                </div>
                <div className="sm:col-span-2">
                  <Label htmlFor="line2">
                    Apartment, unit, complex <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="line2"
                    autoComplete="address-line2"
                    className="mt-1.5 h-11"
                    value={address.line2}
                    onChange={(e) => setField('delivery_address.line2', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="suburb">
                    Suburb <span className="text-muted-foreground">(optional)</span>
                  </Label>
                  <Input
                    id="suburb"
                    autoComplete="address-level3"
                    className="mt-1.5 h-11"
                    value={address.suburb}
                    onChange={(e) => setField('delivery_address.suburb', e.target.value)}
                  />
                </div>
                <div>
                  <Label htmlFor="city">City / town</Label>
                  <Input
                    id="city"
                    autoComplete="address-level2"
                    className="mt-1.5 h-11"
                    value={address.city}
                    onChange={(e) => setField('delivery_address.city', e.target.value)}
                    aria-invalid={Boolean(errors['delivery_address.city'])}
                  />
                  <FieldError message={errors['delivery_address.city']} />
                </div>
                <div>
                  <Label htmlFor="postal_code">Postal code</Label>
                  <Input
                    id="postal_code"
                    inputMode="numeric"
                    autoComplete="postal-code"
                    className="mt-1.5 h-11"
                    value={address.postal_code}
                    onChange={(e) => setField('delivery_address.postal_code', e.target.value)}
                    aria-invalid={Boolean(errors['delivery_address.postal_code'])}
                  />
                  <FieldError message={errors['delivery_address.postal_code']} />
                </div>
                <div>
                  <Label htmlFor="province">Province</Label>
                  <select
                    id="province"
                    autoComplete="address-level1"
                    className={cn(selectClass, 'mt-1.5')}
                    value={address.province}
                    onChange={(e) => setField('delivery_address.province', e.target.value)}
                    aria-invalid={Boolean(errors['delivery_address.province'])}
                  >
                    {PROVINCES.map((p) => (
                      <option key={p} value={p}>
                        {p}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors['delivery_address.province']} />
                </div>
              </div>
            )}

            {fulfilment === 'collection' && (
              <div className="space-y-3">
                <div>
                  <Label htmlFor="collection_point">Collection point</Label>
                  <select
                    id="collection_point"
                    className={cn(selectClass, 'mt-1.5')}
                    value={collectionPointId}
                    onChange={(e) => {
                      setCollectionPointId(e.target.value);
                      setErrors((prev) => {
                        const next = { ...prev };
                        delete next.collection_point_id;
                        return next;
                      });
                    }}
                    aria-invalid={Boolean(errors.collection_point_id)}
                  >
                    {collectionPoints.map((p) => (
                      <option key={p.id} value={p.id}>
                        {p.name}
                        {p.address ? ` — ${p.address}` : ''}
                      </option>
                    ))}
                  </select>
                  <FieldError message={errors.collection_point_id} />
                </div>
                {chosenPoint && (chosenPoint.address || chosenPoint.instructions) && (
                  <div className="rounded-md border border-border bg-secondary/40 p-3 text-sm space-y-1">
                    {chosenPoint.address && <p>{chosenPoint.address}</p>}
                    {chosenPoint.instructions && (
                      <p className="text-muted-foreground whitespace-pre-line">
                        {chosenPoint.instructions}
                      </p>
                    )}
                  </div>
                )}
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="rounded-lg">
          <CardHeader>
            <CardTitle className="font-heading text-lg">Payment</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div role="radiogroup" aria-label="Payment method" className="space-y-2">
              {providers.map((p) => (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={providerId === p.id}
                  onClick={() => {
                    setProviderId(p.id);
                    setErrors((prev) => {
                      const next = { ...prev };
                      delete next.payment_provider;
                      return next;
                    });
                  }}
                  className={cn(
                    'w-full flex items-start gap-3 rounded-lg border p-4 text-left min-h-[44px] transition-colors',
                    providerId === p.id
                      ? 'border-primary bg-primary/10'
                      : 'border-border hover:border-primary/50'
                  )}
                >
                  <span
                    aria-hidden
                    className={cn(
                      'mt-1 w-4 h-4 rounded-full border-2 shrink-0 flex items-center justify-center',
                      providerId === p.id ? 'border-primary' : 'border-muted-foreground'
                    )}
                  >
                    {providerId === p.id && <span className="w-2 h-2 rounded-full bg-primary" />}
                  </span>
                  <span>
                    <span className="block font-medium">{p.label}</span>
                    <span className="block text-xs text-muted-foreground">{p.description}</span>
                  </span>
                </button>
              ))}
            </div>
            <FieldError message={errors.payment_provider} />
            {providerId === 'manual_eft' && !settings.bank_details && (
              <p className="text-xs text-muted-foreground">
                Payment details will be shown on your order page after you place the order.
              </p>
            )}
          </CardContent>
        </Card>

        <div>
          <Label htmlFor="note">
            Note for us <span className="text-muted-foreground">(optional)</span>
          </Label>
          <Textarea
            id="note"
            className="mt-1.5"
            rows={3}
            maxLength={500}
            placeholder="Anything we should know about your order?"
            value={note}
            onChange={(e) => setNote(e.target.value)}
          />
        </div>
      </div>

      <Card className="rounded-lg lg:sticky lg:top-24">
        <CardHeader>
          <CardTitle className="font-heading text-lg flex items-center justify-between">
            Your order
            {loading && <Loader2 className="w-4 h-4 animate-spin text-muted-foreground" />}
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {priceError && (
            <div className="flex items-center justify-between gap-3 rounded-md border border-orange-500/20 bg-orange-500/10 px-3 py-2 text-xs text-orange-400">
              <span>{priceError}</span>
              <Button type="button" size="sm" variant="outline" className="h-8" onClick={refresh}>
                Retry
              </Button>
            </div>
          )}
          {cart ? (
            <div className={cn('transition-opacity', loading && 'opacity-60')}>
              <OrderSummary
                lines={cart.lines}
                subtotal_cents={cart.subtotal_cents}
                delivery_fee_cents={cart.delivery_fee_cents}
                total_cents={cart.total_cents}
                fulfilment={fulfilment}
              />
            </div>
          ) : (
            <div className="space-y-3">
              <Skeleton className="h-14" />
              <Skeleton className="h-14" />
              <Skeleton className="h-20" />
            </div>
          )}
          {cart && !cart.ok && (
            <p className="text-xs text-orange-400">
              Some items in your cart are unavailable.{' '}
              <Link href="/store/cart" className="underline underline-offset-2">
                Review your cart
              </Link>
            </p>
          )}
          <Button
            type="submit"
            size="lg"
            className="w-full min-h-[44px]"
            disabled={!cart?.ok || submitting || loading}
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 mr-2 animate-spin" /> Placing order…
              </>
            ) : (
              <>Place order{cart ? ` · ${formatZar(cart.total_cents)}` : ''}</>
            )}
          </Button>
          <p className="text-xs text-muted-foreground text-center">
            You will get a private link to track this order.
          </p>
        </CardContent>
      </Card>
    </form>
  );
}
