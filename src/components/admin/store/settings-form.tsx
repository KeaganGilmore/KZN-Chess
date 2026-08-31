'use client';

import { useState, useEffect, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Store } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';
import type { StoreSettings } from '@/lib/store/types';
import { randsToCents } from '@/lib/store/money';

interface Issue {
  path: PropertyKey[];
  message: string;
}

interface FormState {
  store_name: string;
  tagline: string;
  store_enabled: boolean;
  payment_enabled: boolean;
  delivery_enabled: boolean;
  delivery_fee: string;
  free_delivery_threshold: string;
  collection_enabled: boolean;
  bank_details: string;
  whatsapp_number: string;
}

function toForm(s: StoreSettings): FormState {
  return {
    store_name: s.store_name,
    tagline: s.tagline ?? '',
    store_enabled: s.store_enabled,
    payment_enabled: s.payment_enabled,
    delivery_enabled: s.delivery_enabled,
    delivery_fee: (s.delivery_fee_cents / 100).toFixed(2),
    free_delivery_threshold:
      s.free_delivery_threshold_cents == null
        ? ''
        : (s.free_delivery_threshold_cents / 100).toFixed(2),
    collection_enabled: s.collection_enabled,
    bank_details: s.bank_details ?? '',
    whatsapp_number: s.whatsapp_number ?? '',
  };
}

const BANK_PLACEHOLDER = ['Bank: ', 'Account name: ', 'Account number: ', 'Branch code: '].join('\n');

export function SettingsForm() {
  const { toast } = useToast();
  const router = useRouter();
  const [form, setForm] = useState<FormState | null>(null);
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    fetch('/api/admin/store/settings')
      .then(async (res) => {
        if (!res.ok) throw new Error();
        setForm(toForm(await res.json()));
      })
      .catch(() => toast({ title: 'Failed to load store settings', variant: 'destructive' }));
  }, [toast]);

  const update = (patch: Partial<FormState>) => setForm((f) => (f ? { ...f, ...patch } : f));

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    if (!form) return;
    setIssues([]);

    const store_name = form.store_name.trim();
    if (store_name.length < 2) {
      toast({ title: 'Store name must be at least 2 characters', variant: 'destructive' });
      return;
    }
    const delivery_fee_cents = randsToCents(form.delivery_fee.trim() || '0');
    if (delivery_fee_cents == null) {
      toast({ title: 'Enter a valid delivery fee in rand', variant: 'destructive' });
      return;
    }
    let free_delivery_threshold_cents: number | null = null;
    if (form.free_delivery_threshold.trim()) {
      free_delivery_threshold_cents = randsToCents(form.free_delivery_threshold);
      if (free_delivery_threshold_cents == null) {
        toast({ title: 'Enter a valid free-delivery threshold in rand', variant: 'destructive' });
        return;
      }
    }
    const whatsapp = form.whatsapp_number.replace(/\D/g, '');
    if (whatsapp && !/^\d{9,15}$/.test(whatsapp)) {
      toast({ title: 'WhatsApp number must be 9–15 digits including the country code', variant: 'destructive' });
      return;
    }
    if (!form.delivery_enabled && !form.collection_enabled && form.store_enabled) {
      toast({ title: 'Enable delivery or collection so customers can check out', variant: 'destructive' });
      return;
    }

    setSaving(true);
    try {
      const res = await fetch('/api/admin/store/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          store_name,
          tagline: form.tagline.trim() || null,
          store_enabled: form.store_enabled,
          payment_enabled: form.payment_enabled,
          delivery_enabled: form.delivery_enabled,
          delivery_fee_cents,
          free_delivery_threshold_cents,
          collection_enabled: form.collection_enabled,
          bank_details: form.bank_details.trim() || null,
          whatsapp_number: whatsapp || null,
        }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (Array.isArray(data.issues)) setIssues(data.issues);
        throw new Error(data.error || 'Failed to save settings');
      }
      setForm(toForm(data as StoreSettings));
      toast({ title: 'Store settings saved' });
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to save settings', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Store className="w-4 h-4 text-primary" />
          Store
        </CardTitle>
        <CardDescription>Name, opening status, delivery and payment details.</CardDescription>
      </CardHeader>
      <CardContent>
        {!form ? (
          <div className="flex items-center justify-center py-10">
            <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-6">
            {issues.length > 0 && (
              <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
                <ul className="list-disc pl-5 space-y-0.5 text-destructive/90">
                  {issues.map((issue, i) => (
                    <li key={i}>
                      {issue.path.length > 0 && (
                        <span className="font-mono text-xs mr-1">{issue.path.map(String).join('.')}:</span>
                      )}
                      {issue.message}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            <div className="grid gap-4 sm:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="s-name">Store name</Label>
                <Input
                  id="s-name"
                  value={form.store_name}
                  onChange={(e) => update({ store_name: e.target.value })}
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="s-tagline">Tagline (optional)</Label>
                <Input
                  id="s-tagline"
                  value={form.tagline}
                  onChange={(e) => update({ tagline: e.target.value })}
                  placeholder="Shown under the store name on the home page"
                  maxLength={200}
                />
              </div>
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
              <div>
                <Label htmlFor="s-open">Store open</Label>
                <p className="text-xs text-muted-foreground">
                  When closed, the home page shows tournaments first and customers cannot check out.
                </p>
              </div>
              <Switch
                id="s-open"
                checked={form.store_enabled}
                onCheckedChange={(checked) => update({ store_enabled: checked })}
              />
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
              <div>
                <Label htmlFor="s-payment">Accept online payment</Label>
                <p className="text-xs text-muted-foreground">
                  When off, checkout still places the order (stock is reserved as normal) but tells
                  the customer you&apos;ll contact them to arrange payment, instead of showing EFT details.
                </p>
              </div>
              <Switch
                id="s-payment"
                checked={form.payment_enabled}
                onCheckedChange={(checked) => update({ payment_enabled: checked })}
              />
            </div>

            <div className="space-y-4 rounded-lg border border-border px-4 py-3">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <Label htmlFor="s-delivery">Courier delivery</Label>
                  <p className="text-xs text-muted-foreground">Flat fee per order.</p>
                </div>
                <Switch
                  id="s-delivery"
                  checked={form.delivery_enabled}
                  onCheckedChange={(checked) => update({ delivery_enabled: checked })}
                />
              </div>
              {form.delivery_enabled && (
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="space-y-2">
                    <Label htmlFor="s-fee">Delivery fee (R)</Label>
                    <Input
                      id="s-fee"
                      inputMode="decimal"
                      value={form.delivery_fee}
                      onChange={(e) => update({ delivery_fee: e.target.value })}
                      placeholder="0.00"
                    />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="s-threshold">Free delivery from (R)</Label>
                    <Input
                      id="s-threshold"
                      inputMode="decimal"
                      value={form.free_delivery_threshold}
                      onChange={(e) => update({ free_delivery_threshold: e.target.value })}
                      placeholder="Leave blank for no free delivery"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex items-center justify-between gap-3 rounded-lg border border-border px-4 py-3">
              <div>
                <Label htmlFor="s-collection">Collection</Label>
                <p className="text-xs text-muted-foreground">
                  Free pick-up at a collection point chosen at checkout. Manage points below.
                </p>
              </div>
              <Switch
                id="s-collection"
                checked={form.collection_enabled}
                onCheckedChange={(checked) => update({ collection_enabled: checked })}
              />
            </div>

            {form.payment_enabled && (
              <div className="space-y-2">
                <Label htmlFor="s-bank">Bank details for EFT</Label>
                <Textarea
                  id="s-bank"
                  value={form.bank_details}
                  onChange={(e) => update({ bank_details: e.target.value })}
                  rows={5}
                  placeholder={BANK_PLACEHOLDER}
                  maxLength={1000}
                />
                <p className="text-xs text-muted-foreground">
                  Shown to customers after checkout. They use their order number as the payment reference.
                </p>
              </div>
            )}

            <div className="space-y-2 max-w-sm">
              <Label htmlFor="s-whatsapp">WhatsApp number</Label>
              <Input
                id="s-whatsapp"
                inputMode="numeric"
                value={form.whatsapp_number}
                onChange={(e) => update({ whatsapp_number: e.target.value })}
                placeholder="27821234567"
              />
              <p className="text-xs text-muted-foreground">
                Digits only, with country code — e.g. 27821234567. Customers can send their order to this number.
              </p>
            </div>

            <div className="flex justify-end">
              <Button type="submit" disabled={saving} className="gap-2">
                {saving && <Loader2 className="w-4 h-4 animate-spin" />}
                Save settings
              </Button>
            </div>
          </form>
        )}
      </CardContent>
    </Card>
  );
}
