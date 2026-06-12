'use client';

import { useState, useEffect, useCallback } from 'react';
import { Loader2, UserCheck, UserX, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ConfirmDialog } from '@/components/ui/confirm-dialog';
import { useToast } from '@/hooks/use-toast';
import { format } from 'date-fns';

export default function AdminOrganizersPage() {
  const { toast } = useToast();
  const [users, setUsers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [revoking, setRevoking] = useState<any | null>(null);

  const fetchUsers = useCallback(async () => {
    try {
      const res = await fetch('/api/users');
      if (!res.ok) throw new Error();
      setUsers(await res.json());
    } catch {
      toast({ title: 'Failed to load users', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  }, [toast]);

  useEffect(() => {
    fetchUsers();
  }, [fetchUsers]);

  const updateRole = async (id: string, role: string) => {
    const res = await fetch(`/api/users/${id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ role }),
    });
    if (res.ok) {
      toast({ title: `User role updated to ${role}` });
      fetchUsers();
    } else {
      const data = await res.json().catch(() => ({}));
      toast({ title: data.error || 'Failed to update role', variant: 'destructive' });
    }
  };

  const matchesSearch = (u: any) => {
    if (!search) return true;
    const q = search.toLowerCase();
    return (
      (u.name || '').toLowerCase().includes(q) ||
      (u.email || '').toLowerCase().includes(q)
    );
  };

  const organizers = users.filter((u) => u.role === 'organizer' && matchesSearch(u));
  const players = users.filter((u) => u.role === 'player' && matchesSearch(u));

  if (loading) {
    return (
      <div className="flex items-center justify-center py-20">
        <Loader2 className="w-6 h-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">Organizer Management</h1>
        <p className="text-muted-foreground mt-1">
          Approve or revoke organizer access for users.
        </p>
      </div>

      <div className="relative max-w-md">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          placeholder="Search users..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="pl-10"
        />
      </div>

      {/* Current Organizers */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Active Organizers ({organizers.length})
        </h2>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">District</TableHead>
                <TableHead className="hidden md:table-cell">Joined</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {organizers.map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {u.email}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {u.district?.name || '-'}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {format(new Date(u.created_at), 'd MMM yyyy')}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="destructive"
                      onClick={() => setRevoking(u)}
                      className="gap-1"
                    >
                      <UserX className="w-3.5 h-3.5" />
                      Revoke
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {organizers.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">
              No organizers found
            </p>
          )}
        </div>
      </div>

      {/* Players to Promote */}
      <div>
        <h2 className="text-lg font-semibold mb-4">
          Players ({players.length})
        </h2>
        <div className="border rounded-lg overflow-hidden">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Name</TableHead>
                <TableHead>Email</TableHead>
                <TableHead className="hidden md:table-cell">District</TableHead>
                <TableHead>Actions</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {players.slice(0, 20).map((u) => (
                <TableRow key={u.id}>
                  <TableCell className="font-medium">{u.name}</TableCell>
                  <TableCell className="text-muted-foreground text-sm">
                    {u.email}
                  </TableCell>
                  <TableCell className="hidden md:table-cell text-sm text-muted-foreground">
                    {u.district?.name || '-'}
                  </TableCell>
                  <TableCell>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => updateRole(u.id, 'organizer')}
                      className="gap-1"
                    >
                      <UserCheck className="w-3.5 h-3.5" />
                      Promote
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {players.length === 0 && (
            <p className="text-center py-8 text-sm text-muted-foreground">
              No players found
            </p>
          )}
          {players.length > 20 && (
            <p className="text-center py-3 text-xs text-muted-foreground border-t">
              Showing first 20 of {players.length} players — use search to narrow down
            </p>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={!!revoking}
        onOpenChange={(o) => !o && setRevoking(null)}
        title="Revoke organizer access?"
        description={
          revoking
            ? `${revoking.name} will no longer be able to manage tournaments. Their existing tournaments remain.`
            : undefined
        }
        confirmLabel="Revoke"
        destructive
        onConfirm={async () => {
          if (revoking) await updateRole(revoking.id, 'player');
          setRevoking(null);
        }}
      />
    </div>
  );
}
