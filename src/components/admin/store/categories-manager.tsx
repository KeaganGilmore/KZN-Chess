'use client';

import { useState, useEffect, useCallback, type FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowDown, ArrowUp, Check, Loader2, Pencil, Plus, Tags, Trash2, X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import type { StoreCategory } from '@/lib/store/types';

export function CategoriesManager() {
  const { toast } = useToast();
  const router = useRouter();
  const [categories, setCategories] = useState<StoreCategory[]>([]);
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [newName, setNewName] = useState('');
  const [editingId, setEditingId] = useState<string | null>(null);
  const [editName, setEditName] = useState('');
  const [deleting, setDeleting] = useState<StoreCategory | null>(null);

  const fetchCategories = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/store/categories');
      if (!res.ok) throw new Error();
      setCategories(await res.json());
    } catch {
      toast({ title: 'Failed to load categories', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchCategories();
  }, [fetchCategories]);

  const request = async (url: string, method: string, body?: unknown) => {
    const res = await fetch(url, {
      method,
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined,
    });
    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data.error || 'Request failed');
    return data;
  };

  const handleAdd = async (e: FormEvent) => {
    e.preventDefault();
    const name = newName.trim();
    if (!name) {
      toast({ title: 'Enter a category name', variant: 'destructive' });
      return;
    }
    setBusy(true);
    try {
      await request('/api/admin/store/categories', 'POST', {
        name,
        sort_order: categories.length,
      });
      setNewName('');
      toast({ title: 'Category added' });
      await fetchCategories();
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to add category', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const startEdit = (c: StoreCategory) => {
    setEditingId(c.id);
    setEditName(c.name);
  };

  const handleRename = async (c: StoreCategory) => {
    const name = editName.trim();
    if (!name) {
      toast({ title: 'Name cannot be empty', variant: 'destructive' });
      return;
    }
    if (name === c.name) {
      setEditingId(null);
      return;
    }
    setBusy(true);
    try {
      await request(`/api/admin/store/categories/${c.id}`, 'PATCH', {
        name,
        slug: c.slug,
        sort_order: c.sort_order,
      });
      setEditingId(null);
      toast({ title: 'Category renamed' });
      await fetchCategories();
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to rename category', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleMove = async (index: number, direction: -1 | 1) => {
    const target = index + direction;
    if (target < 0 || target >= categories.length) return;
    const next = [...categories];
    [next[index], next[target]] = [next[target], next[index]];
    setBusy(true);
    try {
      for (const [i, c] of next.entries()) {
        if (c.sort_order !== i) {
          await request(`/api/admin/store/categories/${c.id}`, 'PATCH', {
            name: c.name,
            slug: c.slug,
            sort_order: i,
          });
        }
      }
      await fetchCategories();
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to reorder categories', variant: 'destructive' });
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      await request(`/api/admin/store/categories/${deleting.id}`, 'DELETE');
      toast({ title: 'Category deleted' });
      await fetchCategories();
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to delete category', variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-base flex items-center gap-2">
          <Tags className="w-4 h-4 text-primary" />
          Categories
        </CardTitle>
        <CardDescription>
          Group products for browsing. Order here is the order shown in the store.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : categories.length === 0 ? (
          <p className="text-sm text-muted-foreground">No categories yet.</p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {categories.map((c, i) => (
              <li key={c.id} className="flex items-center gap-2 px-3 py-2">
                {editingId === c.id ? (
                  <>
                    <Input
                      value={editName}
                      onChange={(e) => setEditName(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          e.preventDefault();
                          handleRename(c);
                        }
                        if (e.key === 'Escape') setEditingId(null);
                      }}
                      autoFocus
                      className="h-8"
                    />
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      onClick={() => handleRename(c)}
                      aria-label="Save"
                    >
                      <Check className="w-4 h-4 text-green-400" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      onClick={() => setEditingId(null)}
                      aria-label="Cancel"
                    >
                      <X className="w-4 h-4" />
                    </Button>
                  </>
                ) : (
                  <>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium truncate">{c.name}</p>
                      <p className="text-xs text-muted-foreground">/{c.slug}</p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy || i === 0}
                      onClick={() => handleMove(i, -1)}
                      aria-label="Move up"
                    >
                      <ArrowUp className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy || i === categories.length - 1}
                      onClick={() => handleMove(i, 1)}
                      aria-label="Move down"
                    >
                      <ArrowDown className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      onClick={() => startEdit(c)}
                      aria-label="Rename"
                    >
                      <Pencil className="w-4 h-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      disabled={busy}
                      onClick={() => setDeleting(c)}
                      aria-label="Delete"
                    >
                      <Trash2 className="w-4 h-4 text-destructive" />
                    </Button>
                  </>
                )}
              </li>
            ))}
          </ul>
        )}

        <form onSubmit={handleAdd} className="flex gap-2">
          <Input
            value={newName}
            onChange={(e) => setNewName(e.target.value)}
            placeholder="New category, e.g. Boards"
            maxLength={60}
          />
          <Button type="submit" disabled={busy} className="gap-2 shrink-0">
            {busy ? <Loader2 className="w-4 h-4 animate-spin" /> : <Plus className="w-4 h-4" />}
            Add
          </Button>
        </form>
      </CardContent>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete category?"
        description={
          deleting
            ? `"${deleting.name}" will be removed. Products keep their data but lose this category.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </Card>
  );
}
