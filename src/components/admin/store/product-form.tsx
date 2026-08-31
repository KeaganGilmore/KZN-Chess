'use client';

import { useState, useEffect, useRef, type FormEvent, type ChangeEvent } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, ImagePlus, Loader2, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import type { Product, StoreCategory } from '@/lib/store/types';
import { randsToCents } from '@/lib/store/money';
import { slugify } from '@/lib/store/slug';

interface VariantRow {
  key: string;
  id?: string;
  name: string;
  sku: string;
  price_delta: string;
  stock_qty: string;
  is_active: boolean;
}

interface ImageRow {
  url: string;
  alt: string;
  /** References a VariantRow.key; null = general photo (shown for any variant with no photo of its own). */
  variant_key: string | null;
}

const GENERAL_IMAGE = 'general';

interface Issue {
  path: PropertyKey[];
  message: string;
}

const NO_CATEGORY = 'none';
const MAX_IMAGES = 12;

let keyCounter = 0;
const nextKey = () => `v${Date.now()}-${keyCounter++}`;

function centsToRandInput(cents: number | null | undefined): string {
  if (cents == null) return '';
  return (cents / 100).toFixed(2);
}

/** Price differences may be negative (e.g. a smaller size costs less). */
function parseSignedRands(input: string): number | null {
  const t = input.trim();
  if (!t) return 0;
  const negative = t.startsWith('-');
  const cents = randsToCents(negative ? t.slice(1) : t);
  if (cents == null) return null;
  return negative ? -cents : cents;
}

function parseQty(input: string): number | null {
  const t = input.trim();
  if (!t) return 0;
  if (!/^\d+$/.test(t)) return null;
  return parseInt(t, 10);
}

function move<T>(list: T[], from: number, to: number): T[] {
  if (to < 0 || to >= list.length) return list;
  const next = [...list];
  const [item] = next.splice(from, 1);
  next.splice(to, 0, item);
  return next;
}

export function ProductForm({ product }: { product?: Product }) {
  const { toast } = useToast();
  const router = useRouter();
  const fileInput = useRef<HTMLInputElement>(null);

  const [name, setName] = useState(product?.name ?? '');
  const [slug, setSlug] = useState(product?.slug ?? '');
  const [slugTouched, setSlugTouched] = useState(!!product);
  const [description, setDescription] = useState(product?.description ?? '');
  const [categoryId, setCategoryId] = useState(product?.category_id ?? NO_CATEGORY);
  const [price, setPrice] = useState(centsToRandInput(product?.price_cents));
  const [compareAt, setCompareAt] = useState(centsToRandInput(product?.compare_at_cents));
  const [stockQty, setStockQty] = useState(String(product?.stock_qty ?? 0));
  const [isActive, setIsActive] = useState(product?.is_active ?? true);
  const [isFeatured, setIsFeatured] = useState(product?.is_featured ?? false);
  const [optionLabel, setOptionLabel] = useState(product?.variants?.[0]?.option_label ?? 'Size');
  const [variants, setVariants] = useState<VariantRow[]>(
    (product?.variants ?? []).map((v) => ({
      key: v.id,
      id: v.id,
      name: v.name,
      sku: v.sku ?? '',
      price_delta: v.price_delta_cents === 0 ? '' : centsToRandInput(v.price_delta_cents),
      stock_qty: String(v.stock_qty),
      is_active: v.is_active,
    }))
  );
  const [images, setImages] = useState<ImageRow[]>(
    (product?.images ?? []).map((img) => ({
      url: img.url,
      alt: img.alt ?? '',
      // An existing variant's client key is its own id (set below), so this
      // needs no translation.
      variant_key: img.variant_id,
    }))
  );

  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [issues, setIssues] = useState<Issue[]>([]);

  useEffect(() => {
    fetch('/api/admin/store/categories')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: StoreCategory[]) => setCategories(data))
      .catch(() => setCategories([]));
  }, []);

  const handleNameChange = (value: string) => {
    setName(value);
    if (!slugTouched) setSlug(value.trim() ? slugify(value) : '');
  };

  const addVariant = () =>
    setVariants((prev) => [
      ...prev,
      { key: nextKey(), name: '', sku: '', price_delta: '', stock_qty: '0', is_active: true },
    ]);

  const updateVariant = (key: string, patch: Partial<VariantRow>) =>
    setVariants((prev) => prev.map((v) => (v.key === key ? { ...v, ...patch } : v)));

  const removeVariant = (key: string) => {
    setVariants((prev) => prev.filter((v) => v.key !== key));
    // Photos tagged to the removed variant fall back to "applies to all"
    // rather than referencing a variant that no longer exists.
    setImages((prev) => prev.map((img) => (img.variant_key === key ? { ...img, variant_key: null } : img)));
  };

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    if (images.length + files.length > MAX_IMAGES) {
      toast({ title: `A product can have at most ${MAX_IMAGES} images`, variant: 'destructive' });
      e.target.value = '';
      return;
    }
    setUploading(true);
    try {
      for (const file of Array.from(files)) {
        const fd = new FormData();
        fd.append('file', file);
        fd.append('folder', 'store');
        const res = await fetch('/api/upload', { method: 'POST', body: fd });
        const data = await res.json().catch(() => ({}));
        if (!res.ok) throw new Error(data.error || 'Upload failed');
        setImages((prev) => [...prev, { url: data.url, alt: '', variant_key: null }]);
      }
    } catch (err: any) {
      toast({ title: err.message || 'Upload failed', variant: 'destructive' });
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const handleSubmit = async (e: FormEvent) => {
    e.preventDefault();
    setIssues([]);

    const trimmedName = name.trim();
    if (trimmedName.length < 2) {
      toast({ title: 'Name must be at least 2 characters', variant: 'destructive' });
      return;
    }
    const trimmedSlug = slug.trim();
    if (trimmedSlug && !/^[a-z0-9-]+$/.test(trimmedSlug)) {
      toast({ title: 'Slug may only contain lowercase letters, numbers and dashes', variant: 'destructive' });
      return;
    }
    const price_cents = randsToCents(price);
    if (price_cents == null) {
      toast({ title: 'Enter a valid price in rand', variant: 'destructive' });
      return;
    }
    let compare_at_cents: number | null = null;
    if (compareAt.trim()) {
      compare_at_cents = randsToCents(compareAt);
      if (compare_at_cents == null) {
        toast({ title: 'Enter a valid compare-at price in rand', variant: 'destructive' });
        return;
      }
    }
    const stock_qty = variants.length === 0 ? parseQty(stockQty) : 0;
    if (stock_qty == null) {
      toast({ title: 'Stock must be a whole number', variant: 'destructive' });
      return;
    }

    const variantBodies = [];
    for (const [i, v] of variants.entries()) {
      if (!v.name.trim()) {
        toast({ title: `Variant ${i + 1} needs a name`, variant: 'destructive' });
        return;
      }
      const price_delta_cents = parseSignedRands(v.price_delta);
      if (price_delta_cents == null) {
        toast({ title: `Variant "${v.name}" has an invalid price difference`, variant: 'destructive' });
        return;
      }
      const vStock = parseQty(v.stock_qty);
      if (vStock == null) {
        toast({ title: `Variant "${v.name}" stock must be a whole number`, variant: 'destructive' });
        return;
      }
      variantBodies.push({
        id: v.id,
        client_key: v.key,
        option_label: optionLabel.trim() || 'Option',
        name: v.name.trim(),
        sku: v.sku.trim() || null,
        price_delta_cents,
        stock_qty: vStock,
        is_active: v.is_active,
        sort_order: i,
      });
    }

    const body = {
      name: trimmedName,
      slug: trimmedSlug || undefined,
      description: description.trim() || null,
      category_id: categoryId === NO_CATEGORY ? null : categoryId,
      price_cents,
      compare_at_cents,
      stock_qty,
      is_active: isActive,
      is_featured: isFeatured,
      sort_order: product?.sort_order ?? 0,
      variants: variantBodies,
      images: images.map((img, i) => ({
        url: img.url,
        alt: img.alt.trim() || null,
        sort_order: i,
        variant_key: img.variant_key,
      })),
    };

    setSaving(true);
    try {
      const res = await fetch(
        product ? `/api/admin/store/products/${product.id}` : '/api/admin/store/products',
        {
          method: product ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        if (Array.isArray(data.issues)) setIssues(data.issues);
        throw new Error(data.error || 'Failed to save product');
      }
      toast({ title: product ? 'Product updated' : 'Product created' });
      router.push('/admin/store/products');
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to save product', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {issues.length > 0 && (
        <div className="rounded-lg border border-destructive/40 bg-destructive/10 px-4 py-3 text-sm">
          <p className="font-medium text-destructive mb-1">Please fix the following:</p>
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

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Details</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="p-name">Name</Label>
                <Input
                  id="p-name"
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Tournament Chess Set"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-slug">URL slug</Label>
                <div className="flex items-center gap-2">
                  <span className="text-sm text-muted-foreground shrink-0">/store/</span>
                  <Input
                    id="p-slug"
                    value={slug}
                    onChange={(e) => {
                      setSlugTouched(true);
                      setSlug(e.target.value);
                    }}
                    placeholder="auto-generated from name"
                  />
                </div>
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-description">Description</Label>
                <Textarea
                  id="p-description"
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={5}
                  placeholder="What is it, what is included, dimensions, material..."
                />
              </div>
              <div className="space-y-2">
                <Label>Category</Label>
                <Select value={categoryId} onValueChange={setCategoryId}>
                  <SelectTrigger>
                    <SelectValue placeholder="No category" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_CATEGORY}>No category</SelectItem>
                    {categories.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
                {categories.length === 0 && (
                  <p className="text-xs text-muted-foreground">
                    No categories yet — add them under{' '}
                    <Link href="/admin/store/settings" className="underline">
                      Store settings
                    </Link>
                    .
                  </p>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Variants</CardTitle>
              <CardDescription>
                Optional. Use variants when the product comes in sizes or colours. Each variant
                tracks its own stock and can cost more or less than the base price.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {variants.length > 0 && (
                <div className="space-y-2 max-w-xs">
                  <Label htmlFor="p-option-label">Option label</Label>
                  <Input
                    id="p-option-label"
                    value={optionLabel}
                    onChange={(e) => setOptionLabel(e.target.value)}
                    placeholder="e.g. Size"
                  />
                </div>
              )}
              {variants.map((v, i) => (
                <div
                  key={v.key}
                  className="rounded-lg border border-border p-3 space-y-3"
                >
                  <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
                    <div className="space-y-1">
                      <Label className="text-xs">{optionLabel.trim() || 'Option'}</Label>
                      <Input
                        value={v.name}
                        onChange={(e) => updateVariant(v.key, { name: e.target.value })}
                        placeholder="e.g. Large"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">SKU (optional)</Label>
                      <Input
                        value={v.sku}
                        onChange={(e) => updateVariant(v.key, { sku: e.target.value })}
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Price difference (R)</Label>
                      <Input
                        inputMode="decimal"
                        value={v.price_delta}
                        onChange={(e) => updateVariant(v.key, { price_delta: e.target.value })}
                        placeholder="0.00"
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">Stock</Label>
                      <Input
                        inputMode="numeric"
                        value={v.stock_qty}
                        onChange={(e) => updateVariant(v.key, { stock_qty: e.target.value })}
                      />
                    </div>
                  </div>
                  <div className="flex items-center justify-between gap-2">
                    <div className="flex items-center gap-2">
                      <Switch
                        id={`v-active-${v.key}`}
                        checked={v.is_active}
                        onCheckedChange={(checked) => updateVariant(v.key, { is_active: checked })}
                      />
                      <Label htmlFor={`v-active-${v.key}`} className="text-xs">
                        Available
                      </Label>
                    </div>
                    <div className="flex items-center gap-1">
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={i === 0}
                        onClick={() => setVariants((prev) => move(prev, i, i - 1))}
                      >
                        <ArrowUp className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        disabled={i === variants.length - 1}
                        onClick={() => setVariants((prev) => move(prev, i, i + 1))}
                      >
                        <ArrowDown className="w-4 h-4" />
                      </Button>
                      <Button
                        type="button"
                        variant="ghost"
                        size="icon"
                        onClick={() => removeVariant(v.key)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </div>
                  </div>
                </div>
              ))}
              <Button type="button" variant="outline" size="sm" className="gap-2" onClick={addVariant}>
                <Plus className="w-4 h-4" />
                Add variant
              </Button>
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Images</CardTitle>
              <CardDescription>
                The first image is the main product photo. JPEG, PNG, WebP or GIF, up to 5MB each.
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {images.map((img, i) => (
                <div key={`${img.url}-${i}`} className="flex items-center gap-3 rounded-lg border border-border p-2">
                  <Image
                    src={img.url}
                    alt={img.alt || `Image ${i + 1}`}
                    width={64}
                    height={64}
                    unoptimized
                    className="w-16 h-16 rounded-md object-cover shrink-0"
                  />
                  <div className="flex-1 min-w-0 space-y-1.5">
                    {i === 0 && <p className="text-xs text-primary font-medium">Main image</p>}
                    <Input
                      value={img.alt}
                      onChange={(e) =>
                        setImages((prev) =>
                          prev.map((x, j) => (j === i ? { ...x, alt: e.target.value } : x))
                        )
                      }
                      placeholder="Alt text (describe the image)"
                    />
                    {variants.length > 0 && (
                      <Select
                        value={img.variant_key ?? GENERAL_IMAGE}
                        onValueChange={(value) =>
                          setImages((prev) =>
                            prev.map((x, j) =>
                              j === i ? { ...x, variant_key: value === GENERAL_IMAGE ? null : value } : x
                            )
                          )
                        }
                      >
                        <SelectTrigger className="h-9 text-xs">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value={GENERAL_IMAGE}>Applies to: all variants</SelectItem>
                          {variants.map((v) => (
                            <SelectItem key={v.key} value={v.key}>
                              Only for: {v.name.trim() || 'Unnamed variant'}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  </div>
                  <div className="flex items-center gap-1 shrink-0">
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={i === 0}
                      onClick={() => setImages((prev) => move(prev, i, i - 1))}
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      disabled={i === images.length - 1}
                      onClick={() => setImages((prev) => move(prev, i, i + 1))}
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="ghost"
                      size="icon"
                      onClick={() => setImages((prev) => prev.filter((_, j) => j !== i))}
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              ))}
              {images.length === 0 && (
                <p className="text-sm text-muted-foreground">No images yet.</p>
              )}
              <input
                ref={fileInput}
                type="file"
                accept="image/jpeg,image/png,image/webp,image/gif"
                multiple
                className="hidden"
                onChange={handleUpload}
              />
              <Button
                type="button"
                variant="outline"
                size="sm"
                className="gap-2"
                disabled={uploading || images.length >= MAX_IMAGES}
                onClick={() => fileInput.current?.click()}
              >
                {uploading ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  <ImagePlus className="w-4 h-4" />
                )}
                {uploading ? 'Uploading...' : 'Upload images'}
              </Button>
            </CardContent>
          </Card>
        </div>

        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Pricing &amp; stock</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="p-price">Price (R, VAT incl.)</Label>
                <Input
                  id="p-price"
                  inputMode="decimal"
                  value={price}
                  onChange={(e) => setPrice(e.target.value)}
                  placeholder="0.00"
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="p-compare">Compare-at price (R, optional)</Label>
                <Input
                  id="p-compare"
                  inputMode="decimal"
                  value={compareAt}
                  onChange={(e) => setCompareAt(e.target.value)}
                  placeholder="Shown struck through when higher than the price"
                />
              </div>
              {variants.length === 0 ? (
                <div className="space-y-2">
                  <Label htmlFor="p-stock">Stock</Label>
                  <Input
                    id="p-stock"
                    inputMode="numeric"
                    value={stockQty}
                    onChange={(e) => setStockQty(e.target.value)}
                  />
                </div>
              ) : (
                <p className="text-xs text-muted-foreground">
                  Stock is tracked per variant.
                </p>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Visibility</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="p-active">Active (visible in the store)</Label>
                <Switch id="p-active" checked={isActive} onCheckedChange={setIsActive} />
              </div>
              <div className="flex items-center justify-between gap-2">
                <Label htmlFor="p-featured">Featured on the home page</Label>
                <Switch id="p-featured" checked={isFeatured} onCheckedChange={setIsFeatured} />
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-2">
            <Button type="submit" disabled={saving || uploading} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {product ? 'Save changes' : 'Create product'}
            </Button>
            <Button asChild type="button" variant="outline" disabled={saving}>
              <Link href="/admin/store/products">Cancel</Link>
            </Button>
          </div>
        </div>
      </div>
    </form>
  );
}
