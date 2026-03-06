'use client';

import { useState, useEffect } from 'react';
import { format } from 'date-fns';
import {
  Check,
  X,
  Star,
  Search,
  Loader2,
  MoreHorizontal,
  Eye,
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
  DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import Link from 'next/link';

const statusColors: Record<string, string> = {
  pending: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  featured: 'bg-primary/10 text-primary border-primary/20',
};

export default function AdminTournamentsPage() {
  const { toast } = useToast();
  const [tournaments, setTournaments] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');
  const [selected, setSelected] = useState<Set<string>>(new Set());

  const fetchTournaments = async () => {
    const res = await fetch('/api/tournaments?all=true');
    if (res.ok) {
      const data = await res.json();
      setTournaments(data);
    }
    setLoading(false);
  };

  useEffect(() => {
    fetchTournaments();
  }, []);

  const updateStatus = async (id: string, status: string) => {
    const res = await fetch(`/api/tournaments/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ status }),
    });
    if (res.ok) {
      toast({ title: `Tournament ${status}` });
      fetchTournaments();
    }
  };

  const bulkAction = async (status: string) => {
    for (const id of selected) {
      await updateStatus(id, status);
    }
    setSelected(new Set());
  };

  const filtered = tournaments.filter((t) => {
    if (search) {
      const q = search.toLowerCase();
      if (!t.name.toLowerCase().includes(q) && !(t.organizer?.name || '').toLowerCase().includes(q)) {
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
            placeholder="Search tournaments or organizers..."
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
          <Button
            size="sm"
            variant="destructive"
            onClick={() => bulkAction('rejected')}
            className="gap-1"
          >
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
                  <p className="font-medium text-sm">{t.name}</p>
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
                      <DropdownMenuItem onClick={() => updateStatus(t.id, 'approved')}>
                        <Check className="w-4 h-4 mr-2" /> Approve
                      </DropdownMenuItem>
                      <DropdownMenuItem onClick={() => updateStatus(t.id, 'featured')}>
                        <Star className="w-4 h-4 mr-2" /> Feature
                      </DropdownMenuItem>
                      <DropdownMenuItem
                        onClick={() => updateStatus(t.id, 'rejected')}
                        className="text-destructive"
                      >
                        <X className="w-4 h-4 mr-2" /> Reject
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
    </div>
  );
}
