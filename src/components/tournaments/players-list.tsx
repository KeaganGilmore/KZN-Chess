'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import type { TournamentPlayer } from '@/lib/types';

interface PlayersListProps {
  tournamentId: string;
  onPlayerClick?: (playerId: string) => void;
}

export function PlayersList({ tournamentId, onPlayerClick }: PlayersListProps) {
  const [players, setPlayers] = useState<TournamentPlayer[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchPlayers = async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/players`);
        if (res.ok) setPlayers(await res.json());
      } finally {
        setLoading(false);
      }
    };
    fetchPlayers();
  }, [tournamentId]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading players...</div>;
  if (players.length === 0) return <div className="py-8 text-center text-muted-foreground">No players registered yet.</div>;

  const approved = players.filter(p => p.is_approved);
  const active = approved.filter(p => !p.is_withdrawn);
  const withdrawn = approved.filter(p => p.is_withdrawn);

  return (
    <div className="space-y-4">
      <p className="text-sm text-muted-foreground">
        {active.length} player{active.length !== 1 ? 's' : ''} registered
        {withdrawn.length > 0 && ` (${withdrawn.length} withdrawn)`}
      </p>

      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b-2 border-border">
              <th className="text-left py-2 px-2">#</th>
              <th className="text-left py-2 px-2">Name</th>
              <th className="text-left py-2 px-2">FIDE Rtg</th>
              <th className="text-left py-2 px-2">Nat Rtg</th>
              <th className="text-left py-2 px-2 hidden sm:table-cell">Club / School</th>
              <th className="text-left py-2 px-2 hidden md:table-cell">District</th>
              <th className="text-left py-2 px-2 hidden md:table-cell">Cat.</th>
            </tr>
          </thead>
          <tbody>
            {active.map(p => (
              <tr key={p.id} className="border-b border-border/50 hover:bg-muted/30">
                <td className="py-2 px-2 text-muted-foreground">{p.starting_rank}</td>
                <td className="py-2 px-2">
                  <button
                    className="text-left hover:underline font-medium"
                    onClick={() => onPlayerClick?.(p.id)}
                  >
                    {p.player_name}
                  </button>
                </td>
                <td className="py-2 px-2">{p.fide_rating || '-'}</td>
                <td className="py-2 px-2">{p.national_rating || '-'}</td>
                <td className="py-2 px-2 hidden sm:table-cell">{p.club || '-'}</td>
                <td className="py-2 px-2 hidden md:table-cell">{p.district || '-'}</td>
                <td className="py-2 px-2 hidden md:table-cell uppercase">{p.age_category}</td>
              </tr>
            ))}
            {withdrawn.map(p => (
              <tr key={p.id} className="border-b border-border/50 text-muted-foreground">
                <td className="py-2 px-2">{p.starting_rank}</td>
                <td className="py-2 px-2 line-through">
                  {p.player_name}
                  <Badge variant="outline" className="ml-1 text-[10px]">WD</Badge>
                </td>
                <td className="py-2 px-2">{p.fide_rating || '-'}</td>
                <td className="py-2 px-2">{p.national_rating || '-'}</td>
                <td className="py-2 px-2 hidden sm:table-cell">{p.club || '-'}</td>
                <td className="py-2 px-2 hidden md:table-cell">{p.district || '-'}</td>
                <td className="py-2 px-2 hidden md:table-cell uppercase">{p.age_category}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
