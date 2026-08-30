'use client';

import { useState, useEffect, useCallback } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import { useRouter } from 'next/navigation';
import { ImageIcon, Loader2, Plus, Search, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Switch } from '@/components/ui/switch';
import { Card, CardContent } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { useToast } from '@/hooks/use-toast';
import type { Product } from '@/lib/store/types';
import { formatZar } from '@/lib/store/money';
import {
  availableStock,
  fromPrice,
  hasVariants,
  primaryImage,
} from '@/lib/store/product-helpers';

export function ProductsTable() {
  const { toast } = useToast();
  const router = useRouter();
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [search, setSearch] = useState('');
  const [query, setQuery] = useState('');
  const [busyId, setBusyId] = useState<string | null>(null);
  const [deleting, setDeleting] = useState<Product | null>(null);

  useEffect(() => {
    const t = setTimeout(() => setQuery(search.trim()), 300);
    return () => clearTimeout(t);
  }, [search]);

  const fetchProducts = useCallback(async () => {
    setRefreshing(true);
    try {
      const res = await fetch(`/api/admin/store/products?q=${encodeURIComponent(query)}`);
      if (!res.ok) throw new Error();
      setProducts(await res.json());
    } catch {
      toast({ title: 'Failed to load products', variant: 'destructive' });
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [query, toast]);

  useEffect(() => {
    fetchProducts();
  }, [fetchProducts]);

  const toggle = async (p: Product, field: 'is_active' | 'is_featured') => {
    setBusyId(p.id);
    try {
      // Partial PATCH: only the toggled flag is sent, so stale stock from this
      // screen can never overwrite stock that checkouts have reduced since.
      const res = await fetch(`/api/admin/store/products/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ [field]: !p[field] }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setProducts((prev) => prev.map((x) => (x.id === p.id ? (data as Product) : x)));
      toast({
        title:
          field === 'is_active'
            ? p.is_active
              ? 'Product hidden from the store'
              : 'Product is now live'
            : p.is_featured
              ? 'Removed from featured'
              : 'Added to featured',
      });
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to update product', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/store/products/${deleting.id}`, { method: 'DELETE' });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      if (data.deactivated) {
        toast({ title: 'Deactivated instead — it has orders' });
      } else {
        toast({ title: 'Product deleted' });
      }
      fetchProducts();
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to delete product', variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
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
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search products..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
          {refreshing && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-muted-foreground" />
          )}
        </div>
        <Button asChild className="gap-2 shrink-0">
          <Link href="/admin/store/products/new">
            <Plus className="w-4 h-4" />
            New product
          </Link>
        </Button>
      </div>

      {products.length === 0 ? (
        <Card>
          <CardContent className="py-12 text-center text-sm text-muted-foreground">
            {query ? 'No products match your search.' : 'No products yet. Create one to start selling.'}
          </CardContent>
        </Card>
      ) : (
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead className="w-14"></TableHead>
                <TableHead>Product</TableHead>
                <TableHead className="hidden md:table-cell">Category</TableHead>
                <TableHead>Price</TableHead>
                <TableHead>Stock</TableHead>
                <TableHead className="hidden sm:table-cell">Featured</TableHead>
                <TableHead>Active</TableHead>
                <TableHead className="w-12"></TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {products.map((p) => {
                const image = primaryImage(p);
                const stock = availableStock(p);
                const busy = busyId === p.id;
                return (
                  <TableRow key={p.id} className={p.is_active ? '' : 'opacity-60'}>
                    <TableCell>
                      {image ? (
                        <Image
                          src={image}
                          alt={p.name}
                          width={40}
                          height={40}
                          unoptimized
                          className="w-10 h-10 rounded-md object-cover border border-border"
                        />
                      ) : (
                        <div className="w-10 h-10 rounded-md border border-border bg-secondary flex items-center justify-center">
                          <ImageIcon className="w-4 h-4 text-muted-foreground" />
                        </div>
                      )}
                    </TableCell>
                    <TableCell>
                      <Link
                        href={`/admin/store/products/${p.id}`}
                        className="font-medium hover:text-primary"
                      >
                        {p.name}
                      </Link>
                      <p className="text-xs text-muted-foreground">/{p.slug}</p>
                    </TableCell>
                    <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                      {p.category?.name || '—'}
                    </TableCell>
                    <TableCell className="text-sm">
                      {hasVariants(p) ? 'From ' : ''}
                      {formatZar(fromPrice(p))}
                    </TableCell>
                    <TableCell className="text-sm">
                      <span
                        className={
                          stock === 0 ? 'text-red-400' : stock <= 3 ? 'text-orange-400' : ''
                        }
                      >
                        {stock}
                      </span>
                      {hasVariants(p) && (
                        <span className="text-xs text-muted-foreground">
                          {' '}
                          · {p.variants!.filter((v) => v.is_active).length} variants
                        </span>
                      )}
                    </TableCell>
                    <TableCell className="hidden sm:table-cell">
                      <Switch
                        checked={p.is_featured}
                        disabled={busy}
                        aria-label={`Featured: ${p.name}`}
                        onCheckedChange={() => toggle(p, 'is_featured')}
                      />
                    </TableCell>
                    <TableCell>
                      <Switch
                        checked={p.is_active}
                        disabled={busy}
                        aria-label={`Active: ${p.name}`}
                        onCheckedChange={() => toggle(p, 'is_active')}
                      />
                    </TableCell>
                    <TableCell>
                      <Button
                        variant="ghost"
                        size="icon"
                        disabled={busy}
                        onClick={() => setDeleting(p)}
                      >
                        <Trash2 className="w-4 h-4 text-destructive" />
                      </Button>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        </div>
      )}

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete product?"
        description={
          deleting
            ? `"${deleting.name}" will be permanently removed. If it has been ordered before it will be deactivated instead so order history stays intact.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </div>
  );
}
