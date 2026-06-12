'use client';

import { useState, useEffect, useCallback } from 'react';
import { format } from 'date-fns';
import {
  Check,
  X,
  Star,
  Search,
  Loader2,
  MoreHorizontal,
  Eye,
  Trash2,
  ShieldCheck,
} from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  pending: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  featured: 'bg-primary/10 text-primary border-primary/20',
};

type Confirmation = {
  title: string;
  description: string;
  confirmLabel: string;
  destructive?: boolean;
  action: () => Promise<void>;
};

export default function AdminTournamentsPage() {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());
  const [confirmation, setConfirmation] = useState<Confirmation | null>(null);

  const fetchTournaments = useCallback(async () => {
    try {
      const res = await fetch('/api/tournaments?all=true');
      if (!res.ok) throw new Error();
      setTournaments(await res.json());
    } catch {
      toast({ title: 'Failed to load tournaments', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchTournaments();
  }, [fetchTournaments]);

  const patchTournament = async (id: string, payload: Record<string, any>) => {
    const res = await fetch(`/api/tournaments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      throw new Error(data.error || 'Update failed');
    }
  };

  const updateStatus = async (id: string, status: string) => {
    try {
      await patchTournament(id, { status });
      toast({ title: `Tournament ${status}` });
      fetchTournaments();
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' });
    }
  };

  const toggleVerified = async (t: any) => {
    try {
      await patchTournament(t.id, { is_verified: !t.is_verified });
      toast({ title: t.is_verified ? 'Endorsement removed' : 'Tournament endorsed' });
      fetchTournaments();
    } catch (err: any) {
      toast({ title: err.message, variant: 'destructive' });
    }
  };

  const deleteTournament = async (id: string) => {
    const res = await fetch(`/api/tournaments/${id}`, { method: 'DELETE' });
    if (!res.ok) {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.error || 'Delete failed', variant: 'destructive' });
      return;
    }
    toast({ title: 'Tournament deleted' });
    fetchTournaments();
  };

  const bulkAction = async (status: string) => {
    const ids = Array.from(selected);
    const results = await Promise.allSettled(ids.map((id) => patchTournament(id, { status })));
    const failed = results.filter((r) => r.status === 'rejected').length;
    if (failed > 0) {
      toast({
        title: `${ids.length - failed} updated, ${failed} failed`,
        variant: 'destructive',
      });
    } else {
      toast({ title: `${ids.length} tournament${ids.length !== 1 ? 's' : ''} ${status}` });
    }
    setSelected(new Set());
    fetchTournaments();
  };

  const confirmReject = (t: any) =>
    setConfirmation({
      title: 'Reject tournament?',
      description: `"${t.name}" will be hidden from public listings. The organizer can still see it.`,
      confirmLabel: 'Reject',
      destructive: true,
      action: () => updateStatus(t.id, 'rejected'),
    });

  const confirmDelete = (t: any) =>
    setConfirmation({
      title: 'Permanently delete tournament?',
      description: `"${t.name}" and all of its players, rounds, results, media, and comments will be permanently removed. This cannot be undone.`,
      confirmLabel: 'Delete Forever',
      destructive: true,
      action: () => deleteTournament(t.id),
    });

  const confirmBulkReject = () =>
    setConfirmation({
      title: `Reject ${selected.size} tournament${selected.size !== 1 ? 's' : ''}?`,
      description: 'All selected tournaments will be hidden from public listings.',
      confirmLabel: 'Reject All',
      destructive: true,
      action: () => bulkAction('rejected'),
    });

  const filtered = tournaments.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      if (
        !(t.name || '').toLowerCase().includes(q) &&
        !(t.organizer?.name || '').toLowerCase().includes(q) &&
        !(t.district?.name || '').toLowerCase().includes(q)
      ) {
        return false;
      }
    }
    if (statusFilter !== 'all' && t.status !== statusFilter) return false;
    return true;
  });

  const toggleSelect = (id: string) => {
    const next = new Set(selected);
    next.has(id) ? next.delete(id) : next.add(id);
    setSelected(next);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold">Tournament Management</h1>
        <p className="text-muted-foreground mt-1">
          Review, approve, and manage all submitted tournaments.
        </p>
      </div>

      {/* Filters */}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search tournaments, organizers, or districts..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="pl-10"
          />
        </div>
        <Select value={statusFilter} onValueChange={setStatusFilter}>
          <SelectTrigger className="w-[160px]">
            <SelectValue placeholder="All Statuses" />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="all">All Statuses</SelectItem>
            <SelectItem value="pending">Pending</SelectItem>
            <SelectItem value="approved">Approved</SelectItem>
            <SelectItem value="rejected">Rejected</SelectItem>
            <SelectItem value="featured">Featured</SelectItem>
          </SelectContent>
        </Select>
      </div>

      {/* Bulk Actions */}
      {selected.size > 0 && (
        <div className="flex items-center gap-3 p-3 rounded-lg bg-primary/5 border border-primary/10">
          <span className="text-sm">{selected.size} selected</span>
          <Button size="sm" onClick={() => bulkAction('approved')} className="gap-1">
            <Check className="w-3.5 h-3.5" /> Approve
          </Button>
          <Button size="sm" variant="destructive" onClick={confirmBulkReject} className="gap-1">
            <X className="w-3.5 h-3.5" /> Reject
          </Button>
          <Button size="sm" variant="ghost" onClick={() => setSelected(new Set())}>
            Clear
          </Button>
        </div>
      )}

      {/* Table */}
      <div className="border rounded-lg overflow-hidden">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead className="w-10">
                <input
                  type="checkbox"
                  checked={selected.size === filtered.length && filtered.length > 0}
                  onChange={(e) => {
                    if (e.target.checked) {
                      setSelected(new Set(filtered.map((t) => t.id)));
                    } else {
                      setSelected(new Set());
                    }
                  }}
                  className="rounded"
                />
              </TableHead>
              <TableHead>Tournament</TableHead>
              <TableHead className="hidden md:table-cell">District</TableHead>
              <TableHead className="hidden md:table-cell">Date</TableHead>
              <TableHead className="hidden lg:table-cell">Organizer</TableHead>
              <TableHead>Status</TableHead>
              <TableHead className="w-10" />
            </TableRow>
          </TableHeader>
          <TableBody>
            {filtered.map((t) => (
              <TableRow key={t.id}>
                <TableCell>
                  <input
                    type="checkbox"
                    checked={selected.has(t.id)}
                    onChange={() => toggleSelect(t.id)}
                    className="rounded"
                  />
                </TableCell>
                <TableCell>
                  <div className="flex items-center gap-1.5">
                    <p className="font-medium text-sm">{t.name}</p>
                    {t.is_verified && (
                      <ShieldCheck className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    )}
                  </div>
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {t.district?.name}
                </TableCell>
                <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                  {format(new Date(t.date), 'd MMM yyyy')}
                </TableCell>
                <TableCell className="hidden lg:table-cell text-sm text-muted-foreground">
                  {t.organizer?.name}
                </TableCell>
                <TableCell>
                  <Badge variant="outline" className={statusColors[t.status] || ''}>
                    {t.status}
                  </Badge>
                </TableCell>
                <TableCell>
                  <DropdownMenu>
                    <DropdownMenuTrigger asChild>
                      <Button variant="ghost" size="icon" className="h-8 w-8">
                        <MoreHorizontal className="w-4 h-4" />
                      </Button>
                    </DropdownMenuTrigger>
                    <DropdownMenuContent align="end">
                      <DropdownMenuItem asChild>
                        <Link href={`/tournaments/${t.id}`}>
                          <Eye className="w-4 h-4 mr-2" /> View
                        </Link>
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => updateStatus(t.id, 'approved')}>
                        <Check className="w-4 h-4 mr-2" /> Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(t.id, 'featured')}>
                        <Star className="w-4 h-4 mr-2" /> Feature
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => toggleVerified(t)}>
                        <ShieldCheck className="w-4 h-4 mr-2" />
                        {t.is_verified ? 'Remove Endorsement' : 'Endorse'}
                      </DropdownMenuItem>
                      <DropdownMenuSeparator />
                      <DropdownMenuItem onClick={() => confirmReject(t)} className="text-destructive">
                        <X className="w-4 h-4 mr-2" /> Reject
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => confirmDelete(t)} className="text-destructive">
                        <Trash2 className="w-4 h-4 mr-2" /> Delete
                      </DropdownMenuItem>
                    </DropdownMenuContent>
                  </DropdownMenu>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
        {filtered.length === 0 && (
          <div className="text-center py-10 text-sm text-muted-foreground">
            No tournaments found
          </div>
        )}
      </div>

      <ConfirmDialog
        open={!!confirmation}
        onOpenChange={(o) => !o && setConfirmation(null)}
        title={confirmation?.title || ''}
        description={confirmation?.description}
        confirmLabel={confirmation?.confirmLabel}
        destructive={confirmation?.destructive}
        onConfirm={async () => {
          await confirmation?.action();
        }}
      />
    </div>
  );
}
