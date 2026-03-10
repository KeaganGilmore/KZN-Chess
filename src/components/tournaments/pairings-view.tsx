'use client';

import { useState, useEffect } from 'react';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Search } from 'lucide-react';
import type { TournamentRound, TournamentPairing } from '@/lib/types';

interface PairingsViewProps {
  tournamentId: string;
  onPlayerClick?: (playerId: string) => void;
}

export function PairingsView({ tournamentId, onPlayerClick }: PairingsViewProps) {
  const [rounds, setRounds] = useState<TournamentRound[]>([]);
  const [selectedRound, setSelectedRound] = useState<string>('');
  const [pairings, setPairings] = useState<TournamentPairing[]>([]);
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchRounds = async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/rounds`);
        if (res.ok) {
          const data: TournamentRound[] = await res.json();
          // Only show published or completed rounds to public
          const visible = data.filter(r => r.status !== 'not_started');
          setRounds(visible);
          if (visible.length > 0) {
            setSelectedRound(visible[visible.length - 1].id);
          }
        }
      } finally {
        setLoading(false);
      }
    };
    fetchRounds();
  }, [tournamentId]);

  useEffect(() => {
    if (!selectedRound) return;
    const fetchPairings = async () => {
      const res = await fetch(`/api/tournaments/${tournamentId}/rounds/${selectedRound}/pairings`);
      if (res.ok) setPairings(await res.json());
    };
    fetchPairings();
  }, [tournamentId, selectedRound]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading...</div>;
  if (rounds.length === 0) return <div className="py-8 text-center text-muted-foreground">No rounds published yet.</div>;

  const filteredPairings = search
    ? pairings.filter(p => {
        const s = search.toLowerCase();
        const w = p.white_player?.player_name?.toLowerCase() || '';
        const b = p.black_player?.player_name?.toLowerCase() || '';
        return w.includes(s) || b.includes(s);
      })
    : pairings;

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2 flex-wrap">
        <Select value={selectedRound} onValueChange={setSelectedRound}>
          <SelectTrigger className="w-[140px]">
            <SelectValue placeholder="Select round" />
          </SelectTrigger>
          <SelectContent>
            {rounds.map(r => (
              <SelectItem key={r.id} value={r.id}>Round {r.round_number}</SelectItem>
            ))}
          </SelectContent>
        </Select>

        <div className="relative flex-1 min-w-[150px] max-w-[300px]">
          <Search className="absolute left-2 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
          <Input
            placeholder="Search player..."
            value={search}
            onChange={e => setSearch(e.target.value)}
            className="pl-8 h-9"
          />
        </div>
      </div>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left py-2 px-2 w-12">Bd</th>
              <th className="text-left py-2 px-2">White</th>
              <th className="text-center py-2 px-2 w-16">Result</th>
              <th className="text-right py-2 px-2">Black</th>
            </tr>
          </thead>
          <tbody>
            {filteredPairings.map(p => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-2 text-muted-foreground">{p.board_number}</td>
                <td className="py-2 px-2">
                  <button
                    className="text-left hover:underline"
                    onClick={() => onPlayerClick?.(p.white_player_id)}
                  >
                    <span className="font-medium">{p.white_player?.player_name || '?'}</span>
                    {(p.white_player?.fide_rating || p.white_player?.national_rating) && (
                      <span className="text-muted-foreground ml-1 text-xs">
                        ({p.white_player.fide_rating || p.white_player.national_rating})
                      </span>
                    )}
                  </button>
                </td>
                <td className="py-2 px-2 text-center font-medium">
                  {p.is_bye ? 'BYE' : resultDisplayShort(p.result)}
                </td>
                <td className="py-2 px-2 text-right">
                  {p.black_player ? (
                    <button
                      className="text-right hover:underline"
                      onClick={() => p.black_player_id && onPlayerClick?.(p.black_player_id)}
                    >
                      <span className="font-medium">{p.black_player.player_name}</span>
                      {(p.black_player.fide_rating || p.black_player.national_rating) && (
                        <span className="text-muted-foreground ml-1 text-xs">
                          ({p.black_player.fide_rating || p.black_player.national_rating})
                        </span>
                      )}
                    </button>
                  ) : null}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {filteredPairings.length === 0 && pairings.length > 0 && (
        <p className="text-sm text-muted-foreground text-center">No matches found for &quot;{search}&quot;</p>
      )}
    </div>
  );
}

function resultDisplayShort(result: string | null): string {
  if (!result) return 'vs';
  switch (result) {
    case '1-0': return '1-0';
    case '0-1': return '0-1';
    case 'draw': return '½-½';
    case 'white_forfeit': return '+−';
    case 'black_forfeit': return '−+';
    case 'double_forfeit': return '−−';
    default: return result;
  }
}
