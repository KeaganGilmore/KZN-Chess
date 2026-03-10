'use client';

import { useState, useEffect } from 'react';
import { Badge } from '@/components/ui/badge';
import type { PlayerStanding, TournamentSettings, TiebreakMethod } from '@/lib/types';
import { TIEBREAK_LABELS } from '@/lib/types';

interface StandingsViewProps {
  tournamentId: string;
  onPlayerClick?: (playerId: string) => void;
}

export function StandingsView({ tournamentId, onPlayerClick }: StandingsViewProps) {
  const [standings, setStandings] = useState<PlayerStanding[]>([]);
  const [settings, setSettings] = useState<TournamentSettings | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchStandings = async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/standings`);
        if (res.ok) {
          const data = await res.json();
          setStandings(data.standings || []);
          setSettings(data.settings || null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchStandings();

    // Auto-refresh every 30 seconds for live updates
    const interval = setInterval(fetchStandings, 30000);
    return () => clearInterval(interval);
  }, [tournamentId]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading standings...</div>;
  if (standings.length === 0) return <div className="py-8 text-center text-muted-foreground">No standings data yet.</div>;

  const tiebreakOrder = settings?.tiebreak_order || [];
  const leader = standings[0];

  return (
    <div className="overflow-x-auto">
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-border">
            <th className="text-left py-2 px-2 sticky left-0 bg-background z-10 min-w-[40px]">#</th>
            <th className="text-left py-2 px-2 sticky left-[40px] bg-background z-10 min-w-[150px]">Name</th>
            <th className="text-left py-2 px-2 min-w-[60px]">Rating</th>
            <th className="text-left py-2 px-2 min-w-[80px] hidden md:table-cell">Club</th>
            <th className="text-center py-2 px-2 min-w-[50px] font-bold">Pts</th>
            {tiebreakOrder.map(tb => (
              <th key={tb} className="text-center py-2 px-2 min-w-[50px] text-xs" title={TIEBREAK_LABELS[tb]}>
                {shortTiebreakLabel(tb)}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {standings.map(s => {
            const isLeader = s.points === leader.points && s.rank <= 1;
            return (
              <tr
                key={s.player.id}
                className={`border-b border-border/50 hover:bg-muted/30 ${isLeader ? 'bg-amber-500/10' : ''}`}
              >
                <td className="py-2 px-2 sticky left-0 bg-background font-medium">{s.rank}</td>
                <td className="py-2 px-2 sticky left-[40px] bg-background">
                  <button
                    className="text-left hover:underline font-medium"
                    onClick={() => onPlayerClick?.(s.player.id)}
                  >
                    {s.player.player_name}
                  </button>
                  {s.player.is_withdrawn && (
                    <Badge variant="outline" className="ml-1 text-[10px]">WD</Badge>
                  )}
                </td>
                <td className="py-2 px-2 text-muted-foreground">
                  {s.player.fide_rating || s.player.national_rating || '-'}
                </td>
                <td className="py-2 px-2 text-muted-foreground hidden md:table-cell">
                  {s.player.club || '-'}
                </td>
                <td className="py-2 px-2 text-center font-bold">{s.points}</td>
                {tiebreakOrder.map(tb => (
                  <td key={tb} className="py-2 px-2 text-center text-muted-foreground text-xs">
                    {formatTiebreak(s.tiebreaks[tb])}
                  </td>
                ))}
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}

function shortTiebreakLabel(method: TiebreakMethod): string {
  const shorts: Record<TiebreakMethod, string> = {
    buchholz: 'BH',
    buchholz_cut1: 'BH-C1',
    median_buchholz: 'MBH',
    sonneborn_berger: 'SB',
    progressive: 'Prog',
    direct_encounter: 'DE',
    aro: 'ARO',
    num_wins: 'Wins',
    num_blacks: '#B',
  };
  return shorts[method] || method;
}

function formatTiebreak(value: number): string {
  if (value === 0) return '0';
  if (Number.isInteger(value)) return value.toString();
  return value.toFixed(1);
}
