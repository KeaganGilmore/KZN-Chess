'use client';

import { useState, useRef } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { UserPlus, Upload, Trash2, X, UserMinus } from 'lucide-react';
import toast from 'react-hot-toast';
import type { TournamentPlayer, AgeCategory, SexType } from '@/lib/types';

interface PlayerManagementProps {
  tournamentId: string;
  players: TournamentPlayer[];
  onPlayersChange: () => void;
}

const AGE_CATEGORIES: { value: AgeCategory; label: string }[] = [
  { value: 'open', label: 'Open' },
  { value: 'u8', label: 'U8' },
  { value: 'u10', label: 'U10' },
  { value: 'u12', label: 'U12' },
  { value: 'u14', label: 'U14' },
  { value: 'u16', label: 'U16' },
  { value: 'u18', label: 'U18' },
];

export function PlayerManagement({ tournamentId, players, onPlayersChange }: PlayerManagementProps) {
  const [showForm, setShowForm] = useState(false);
  const [loading, setLoading] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [form, setForm] = useState({
    player_name: '',
    fide_id: '',
    chess_sa_id: '',
    fide_rating: '',
    national_rating: '',
    club: '',
    district: '',
    sex: '' as SexType | '',
    age_category: 'open' as AgeCategory,
  });

  const resetForm = () => {
    setForm({
      player_name: '', fide_id: '', chess_sa_id: '',
      fide_rating: '', national_rating: '', club: '',
      district: '', sex: '', age_category: 'open',
    });
  };

  const handleAddPlayer = async () => {
    if (!form.player_name.trim()) {
      toast.error('Player name is required');
      return;
    }

    setLoading(true);
    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/players`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...form,
          fide_rating: form.fide_rating ? parseInt(form.fide_rating) : null,
          national_rating: form.national_rating ? parseInt(form.national_rating) : null,
          sex: form.sex || null,
        }),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      toast.success('Player added');
      resetForm();
      setShowForm(false);
      onPlayersChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to add player');
    } finally {
      setLoading(false);
    }
  };

  const handleWithdraw = async (playerId: string, playerName: string) => {
    if (!confirm(`Withdraw ${playerName}?`)) return;

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/players`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ player_id: playerId, is_withdrawn: true }),
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`${playerName} withdrawn`);
      onPlayersChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to withdraw player');
    }
  };

  const handleDelete = async (playerId: string, playerName: string) => {
    if (!confirm(`Delete ${playerName}? This cannot be undone.`)) return;

    try {
      const res = await fetch(`/api/tournaments/${tournamentId}/players?player_id=${playerId}`, {
        method: 'DELETE',
      });
      if (!res.ok) throw new Error((await res.json()).error);
      toast.success(`${playerName} removed`);
      onPlayersChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Failed to delete player');
    }
  };

  const handleCSVImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setLoading(true);
    try {
      const text = await file.text();
      const lines = text.split('\n').map(l => l.trim()).filter(Boolean);
      if (lines.length < 2) throw new Error('CSV must have a header row and at least one data row');

      const headers = lines[0].split(',').map(h => h.trim().toLowerCase());
      const rows = lines.slice(1).map(line => {
        const values = line.split(',').map(v => v.trim().replace(/^"|"$/g, ''));
        const row: Record<string, string> = {};
        headers.forEach((h, i) => { row[h] = values[i] || ''; });
        return row;
      });

      // Map common header variations
      const mapped = rows.map(row => ({
        name: row.name || row.player_name || row.player || '',
        fide_id: row.fide_id || row.fideid || '',
        national_id: row.national_id || row.chess_sa_id || row.chessaid || '',
        fide_rating: row.fide_rating || row.fiderating || row.rating || '',
        national_rating: row.national_rating || row.nationalrating || '',
        club: row.club || row.school || '',
        district: row.district || '',
        sex: row.sex || row.gender || '',
        category: row.category || row.age_category || row.section || '',
      }));

      const res = await fetch(`/api/tournaments/${tournamentId}/players/import`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rows: mapped }),
      });

      if (!res.ok) throw new Error((await res.json()).error);
      const result = await res.json();
      toast.success(`Imported ${result.imported} players`);
      onPlayersChange();
    } catch (err: unknown) {
      toast.error(err instanceof Error ? err.message : 'Import failed');
    } finally {
      setLoading(false);
      if (fileInputRef.current) fileInputRef.current.value = '';
    }
  };

  const activePlayers = players.filter(p => !p.is_withdrawn);
  const withdrawnPlayers = players.filter(p => p.is_withdrawn);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center gap-2">
        <Button onClick={() => setShowForm(!showForm)} size="sm" variant="outline">
          <UserPlus className="w-4 h-4 mr-1" /> Add Player
        </Button>
        <Button onClick={() => fileInputRef.current?.click()} size="sm" variant="outline" disabled={loading}>
          <Upload className="w-4 h-4 mr-1" /> Import CSV
        </Button>
        <input
          ref={fileInputRef}
          type="file"
          accept=".csv,.txt"
          className="hidden"
          onChange={handleCSVImport}
        />
        <span className="text-sm text-muted-foreground">
          {activePlayers.length} active player{activePlayers.length !== 1 ? 's' : ''}
        </span>
      </div>

      {showForm && (
        <Card>
          <CardHeader className="pb-3">
            <div className="flex items-center justify-between">
              <CardTitle className="text-sm">Add Player</CardTitle>
              <Button size="icon" variant="ghost" onClick={() => setShowForm(false)}>
                <X className="w-4 h-4" />
              </Button>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
              <div>
                <Label className="text-xs">Name *</Label>
                <Input
                  value={form.player_name}
                  onChange={e => setForm({ ...form, player_name: e.target.value })}
                  placeholder="J. Smith"
                />
              </div>
              <div>
                <Label className="text-xs">FIDE ID</Label>
                <Input
                  value={form.fide_id}
                  onChange={e => setForm({ ...form, fide_id: e.target.value })}
                  placeholder="14300001"
                />
              </div>
              <div>
                <Label className="text-xs">Chess SA ID</Label>
                <Input
                  value={form.chess_sa_id}
                  onChange={e => setForm({ ...form, chess_sa_id: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">FIDE Rating</Label>
                <Input
                  type="number"
                  value={form.fide_rating}
                  onChange={e => setForm({ ...form, fide_rating: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">National Rating</Label>
                <Input
                  type="number"
                  value={form.national_rating}
                  onChange={e => setForm({ ...form, national_rating: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Club / School</Label>
                <Input
                  value={form.club}
                  onChange={e => setForm({ ...form, club: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">District</Label>
                <Input
                  value={form.district}
                  onChange={e => setForm({ ...form, district: e.target.value })}
                />
              </div>
              <div>
                <Label className="text-xs">Sex</Label>
                <Select value={form.sex} onValueChange={v => setForm({ ...form, sex: v as SexType })}>
                  <SelectTrigger><SelectValue placeholder="Select" /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="M">Male</SelectItem>
                    <SelectItem value="F">Female</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-xs">Category</Label>
                <Select value={form.age_category} onValueChange={v => setForm({ ...form, age_category: v as AgeCategory })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    {AGE_CATEGORIES.map(c => (
                      <SelectItem key={c.value} value={c.value}>{c.label}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <Button onClick={handleAddPlayer} disabled={loading} className="mt-3 w-full sm:w-auto">
              {loading ? 'Adding...' : 'Add Player'}
            </Button>
          </CardContent>
        </Card>
      )}

      {/* Player List */}
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-border">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">Name</th>
              <th className="text-left py-2 px-2 hidden sm:table-cell">Rating</th>
              <th className="text-left py-2 px-2 hidden md:table-cell">Club</th>
              <th className="text-left py-2 px-2 hidden md:table-cell">Cat.</th>
              <th className="text-right py-2 px-2">Actions</th>
            </tr>
          </thead>
          <tbody>
            {activePlayers.map(p => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-2 text-muted-foreground">{p.starting_rank}</td>
                <td className="py-2 px-2 font-medium">{p.player_name}</td>
                <td className="py-2 px-2 hidden sm:table-cell">
                  {p.fide_rating || p.national_rating || '-'}
                </td>
                <td className="py-2 px-2 hidden md:table-cell">{p.club || '-'}</td>
                <td className="py-2 px-2 hidden md:table-cell uppercase">{p.age_category}</td>
                <td className="py-2 px-2 text-right">
                  <div className="flex items-center justify-end gap-1">
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7"
                      onClick={() => handleWithdraw(p.id, p.player_name)}
                      title="Withdraw"
                    >
                      <UserMinus className="w-3.5 h-3.5" />
                    </Button>
                    <Button
                      size="icon"
                      variant="ghost"
                      className="h-7 w-7 text-destructive hover:text-destructive"
                      onClick={() => handleDelete(p.id, p.player_name)}
                      title="Delete"
                    >
                      <Trash2 className="w-3.5 h-3.5" />
                    </Button>
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {withdrawnPlayers.length > 0 && (
        <details className="text-sm">
          <summary className="cursor-pointer text-muted-foreground">
            {withdrawnPlayers.length} withdrawn player{withdrawnPlayers.length !== 1 ? 's' : ''}
          </summary>
          <div className="mt-2 space-y-1">
            {withdrawnPlayers.map(p => (
              <div key={p.id} className="flex items-center gap-2 text-muted-foreground line-through">
                <span>{p.starting_rank}.</span>
                <span>{p.player_name}</span>
              </div>
            ))}
          </div>
        </details>
      )}
    </div>
  );
}
