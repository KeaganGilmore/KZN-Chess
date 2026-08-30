'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { format } from 'date-fns';
import { Loader2, MapPin, Pencil, Plus, Trash2 } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import type { CollectionPoint } from '@/lib/store/types';

/** Only what the tournament select needs from GET /api/tournaments. */
interface TournamentOption {
  id: string;
  name: string;
  date: string;
  venue: string;
}

const NO_TOURNAMENT = 'none';

interface FormState {
  name: string;
  address: string;
  instructions: string;
  tournament_id: string;
  is_active: boolean;
}

const emptyForm: FormState = {
  name: '',
  address: '',
  instructions: '',
  tournament_id: NO_TOURNAMENT,
  is_active: true,
};

function pointBody(p: CollectionPoint, patch: Partial<CollectionPoint> = {}) {
  const merged = { ...p, ...patch };
  return {
    name: merged.name,
    address: merged.address,
    instructions: merged.instructions,
    tournament_id: merged.tournament_id,
    is_active: merged.is_active,
    sort_order: merged.sort_order,
  };
}

export function CollectionPointsManager() {
  const { toast } = useToast();
  const router = useRouter();
  const [points, setPoints] = useState<CollectionPoint[]>([]);
  const [tournaments, setTournaments] = useState<TournamentOption[]>([]);
  const [loading, setLoading] = useState(true);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [busyId, setBusyId] = useState<string | null>(null);
  const [editing, setEditing] = useState<CollectionPoint | null>(null);
  const [deleting, setDeleting] = useState<CollectionPoint | null>(null);
  const [form, setForm] = useState<FormState>(emptyForm);

  const fetchPoints = useCallback(async () => {
    try {
      const res = await fetch('/api/admin/store/collection-points');
      if (!res.ok) throw new Error();
      setPoints(await res.json());
    } catch {
      toast({ title: 'Failed to load collection points', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchPoints();
    // Tournament list is optional — if it fails the select is simply hidden.
    fetch('/api/tournaments')
      .then((res) => (res.ok ? res.json() : []))
      .then((data: TournamentOption[]) =>
        setTournaments(
          (Array.isArray(data) ? data : []).map((t) => ({
            id: t.id,
            name: t.name,
            date: t.date,
            venue: t.venue,
          }))
        )
      )
      .catch(() => setTournaments([]));
  }, [fetchPoints]);

  const today = new Date().toISOString().slice(0, 10);
  const tournamentOptions = tournaments.filter(
    (t) => t.date >= today || t.id === form.tournament_id
  );
  const tournamentName = (id: string | null) =>
    id ? tournaments.find((t) => t.id === id)?.name ?? null : null;

  const openCreate = () => {
    setEditing(null);
    setForm(emptyForm);
    setDialogOpen(true);
  };

  const openEdit = (p: CollectionPoint) => {
    setEditing(p);
    setForm({
      name: p.name,
      address: p.address ?? '',
      instructions: p.instructions ?? '',
      tournament_id: p.tournament_id ?? NO_TOURNAMENT,
      is_active: p.is_active,
    });
    setDialogOpen(true);
  };

  const handleSave = async () => {
    const name = form.name.trim();
    if (name.length < 2) {
      toast({ title: 'Name must be at least 2 characters', variant: 'destructive' });
      return;
    }
    setSaving(true);
    const body = {
      name,
      address: form.address.trim() || null,
      instructions: form.instructions.trim() || null,
      tournament_id: form.tournament_id === NO_TOURNAMENT ? null : form.tournament_id,
      is_active: form.is_active,
      sort_order: editing?.sort_order ?? points.length,
    };
    try {
      const res = await fetch(
        editing
          ? `/api/admin/store/collection-points/${editing.id}`
          : '/api/admin/store/collection-points',
        {
          method: editing ? 'PATCH' : 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(body),
        }
      );
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast({ title: editing ? 'Collection point updated' : 'Collection point added' });
      setDialogOpen(false);
      await fetchPoints();
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to save collection point', variant: 'destructive' });
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async (p: CollectionPoint) => {
    setBusyId(p.id);
    try {
      const res = await fetch(`/api/admin/store/collection-points/${p.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(pointBody(p, { is_active: !p.is_active })),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      setPoints((prev) => prev.map((x) => (x.id === p.id ? { ...x, is_active: !p.is_active } : x)));
      toast({ title: p.is_active ? 'Collection point hidden' : 'Collection point available' });
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to update collection point', variant: 'destructive' });
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleting) return;
    try {
      const res = await fetch(`/api/admin/store/collection-points/${deleting.id}`, {
        method: 'DELETE',
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error);
      toast({ title: 'Collection point deleted' });
      await fetchPoints();
      router.refresh();
    } catch (err: any) {
      toast({ title: err.message || 'Failed to delete collection point', variant: 'destructive' });
    } finally {
      setDeleting(null);
    }
  };

  return (
    <Card>
      <CardHeader>
        <div className="flex items-start justify-between gap-4">
          <div>
            <CardTitle className="text-base flex items-center gap-2">
              <MapPin className="w-4 h-4 text-primary" />
              Collection points
            </CardTitle>
            <CardDescription className="mt-1.5">
              Places customers can pick up orders for free — a club venue, a shop, or a tournament.
            </CardDescription>
          </div>
          <Button size="sm" onClick={openCreate} className="gap-2 shrink-0">
            <Plus className="w-4 h-4" />
            Add
          </Button>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="flex items-center justify-center py-6">
            <Loader2 className="w-5 h-5 animate-spin text-muted-foreground" />
          </div>
        ) : points.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            No collection points yet. Add one so customers can choose collection at checkout.
          </p>
        ) : (
          <ul className="divide-y divide-border rounded-lg border border-border">
            {points.map((p) => {
              const linked = tournamentName(p.tournament_id);
              return (
                <li key={p.id} className="flex items-center gap-3 px-3 py-3">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 flex-wrap">
                      <p className="text-sm font-medium">{p.name}</p>
                      {linked && (
                        <Badge variant="outline" className="text-xs">
                          {linked}
                        </Badge>
                      )}
                    </div>
                    {p.address && (
                      <p className="text-xs text-muted-foreground truncate">{p.address}</p>
                    )}
                  </div>
                  <Switch
                    checked={p.is_active}
                    disabled={busyId === p.id}
                    onCheckedChange={() => toggleActive(p)}
                    aria-label="Available at checkout"
                  />
                  <Button variant="ghost" size="icon" onClick={() => openEdit(p)} aria-label="Edit">
                    <Pencil className="w-4 h-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => setDeleting(p)}
                    aria-label="Delete"
                  >
                    <Trash2 className="w-4 h-4 text-destructive" />
                  </Button>
                </li>
              );
            })}
          </ul>
        )}
      </CardContent>

      <Dialog open={dialogOpen} onOpenChange={(o) => !saving && setDialogOpen(o)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>{editing ? 'Edit collection point' : 'New collection point'}</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="cp-name">Name</Label>
              <Input
                id="cp-name"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
                placeholder="e.g. Durban Chess Club"
                maxLength={100}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-address">Address (optional)</Label>
              <Input
                id="cp-address"
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
                maxLength={300}
              />
            </div>
            <div className="space-y-2">
              <Label htmlFor="cp-instructions">Instructions (optional)</Label>
              <Textarea
                id="cp-instructions"
                value={form.instructions}
                onChange={(e) => setForm({ ...form, instructions: e.target.value })}
                rows={3}
                placeholder="e.g. Collect from the arbiter's desk between rounds"
                maxLength={500}
              />
            </div>
            {tournamentOptions.length > 0 && (
              <div className="space-y-2">
                <Label>Tournament (optional)</Label>
                <Select
                  value={form.tournament_id}
                  onValueChange={(v) => setForm({ ...form, tournament_id: v })}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Not linked to a tournament" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value={NO_TOURNAMENT}>Not linked to a tournament</SelectItem>
                    {tournamentOptions.map((t) => (
                      <SelectItem key={t.id} value={t.id}>
                        {t.name} · {format(new Date(t.date), 'd MMM yyyy')}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            <div className="flex items-center gap-2">
              <Switch
                id="cp-active"
                checked={form.is_active}
                onCheckedChange={(checked) => setForm({ ...form, is_active: checked })}
              />
              <Label htmlFor="cp-active">Available at checkout</Label>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setDialogOpen(false)} disabled={saving}>
              Cancel
            </Button>
            <Button onClick={handleSave} disabled={saving} className="gap-2">
              {saving && <Loader2 className="w-4 h-4 animate-spin" />}
              {editing ? 'Save changes' : 'Add'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      <ConfirmDialog
        open={!!deleting}
        onOpenChange={(o) => !o && setDeleting(null)}
        title="Delete collection point?"
        description={
          deleting
            ? `"${deleting.name}" will be removed. Existing orders keep the name they were placed with.`
            : undefined
        }
        confirmLabel="Delete"
        destructive
        onConfirm={handleDelete}
      />
    </Card>
  );
}
