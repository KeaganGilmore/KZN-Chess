'use client';

import { useState, useEffect } from 'react';
import { Printer } from 'lucide-react';
import { Button } from '@/components/ui/button';
import type { TournamentPlayer, TournamentRound, TournamentPairing } from '@/lib/types';

interface CrosstableViewProps {
  tournamentId: string;
  onPlayerClick?: (playerId: string) => void;
}

interface CrosstableRow {
  player: TournamentPlayer;
  rank: number;
  points: number;
  results: Map<string, { display: string; round: number }>;
}

export function CrosstableView({ tournamentId, onPlayerClick }: CrosstableViewProps) {
  const [rows, setRows] = useState<CrosstableRow[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const [standingsRes, roundsRes] = await Promise.all([
          fetch(`/api/tournaments/${tournamentId}/standings`),
          fetch(`/api/tournaments/${tournamentId}/rounds`),
        ]);

        if (!standingsRes.ok || !roundsRes.ok) return;

        const standingsData = await standingsRes.json();
        const rounds: TournamentRound[] = await roundsRes.json();

        // Fetch all rounds' pairings concurrently
        const pairingsPerRound = await Promise.all(
          rounds.map(async (round) => {
            const pRes = await fetch(`/api/tournaments/${tournamentId}/rounds/${round.id}/pairings`);
            if (!pRes.ok) return [];
            const pairings = await pRes.json();
            return pairings.map((p: TournamentPairing) => ({ ...p, _round: round.round_number }));
          })
        );
        const allPairings: TournamentPairing[] = pairingsPerRound.flat();

        const standings = standingsData.standings || [];

        // Build crosstable
        const crosstableRows: CrosstableRow[] = standings.map((s: { player: TournamentPlayer; rank: number; points: number }) => {
          const results = new Map<string, { display: string; round: number }>();

          for (const pairing of allPairings) {
            const roundNum = (pairing as unknown as { _round: number })._round;

            if (pairing.white_player_id === s.player.id && pairing.black_player_id) {
              results.set(pairing.black_player_id, {
                display: resultDisplay(pairing.result, 'white'),
                round: roundNum,
              });
            } else if (pairing.black_player_id === s.player.id) {
              results.set(pairing.white_player_id, {
                display: resultDisplay(pairing.result, 'black'),
                round: roundNum,
              });
            }
          }

          return {
            player: s.player,
            rank: s.rank,
            points: s.points,
            results,
          };
        });

        setRows(crosstableRows);
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tournamentId]);

  if (loading) return <div className="py-8 text-center text-muted-foreground">Loading crosstable...</div>;
  if (rows.length === 0) return <div className="py-8 text-center text-muted-foreground">No data yet.</div>;

  return (
    <div className="space-y-3">
      <div className="flex justify-end">
        <Button
          variant="outline"
          size="sm"
          className="gap-1.5"
          onClick={() => window.open(`/tournaments/${tournamentId}/print/crosstable`, '_blank')}
        >
          <Printer className="w-3.5 h-3.5" />
          Print / PDF
        </Button>
      </div>
      <div className="overflow-x-auto">
      <table className="text-xs border-collapse">
        <thead>
          <tr className="border-b-2 border-border">
            <th className="py-2 px-1 text-left sticky left-0 bg-background z-10 min-w-[30px]">#</th>
            <th className="py-2 px-2 text-left sticky left-[30px] bg-background z-10 min-w-[120px]">Name</th>
            {rows.map(r => (
              <th key={r.player.id} className="py-2 px-1 text-center min-w-[28px]">
                {r.player.starting_rank}
              </th>
            ))}
            <th className="py-2 px-2 text-center font-bold min-w-[40px]">Pts</th>
          </tr>
        </thead>
        <tbody>
          {rows.map(row => (
            <tr key={row.player.id} className="border-b border-border/50 hover:bg-muted/30">
              <td className="py-1 px-1 sticky left-0 bg-background">{row.rank}</td>
              <td className="py-1 px-2 sticky left-[30px] bg-background">
                <button
                  className="text-left hover:underline font-medium truncate max-w-[120px] block"
                  onClick={() => onPlayerClick?.(row.player.id)}
                >
                  {row.player.player_name}
                </button>
              </td>
              {rows.map(col => {
                if (col.player.id === row.player.id) {
                  return (
                    <td key={col.player.id} className="py-1 px-1 text-center bg-muted/50">×</td>
                  );
                }
                const cell = row.results.get(col.player.id);
                return (
                  <td
                    key={col.player.id}
                    className={`py-1 px-1 text-center ${
                      cell?.display === '1' ? 'text-green-400 font-bold' :
                      cell?.display === '0' ? 'text-red-400' :
                      cell?.display === '½' ? 'text-blue-400' :
                      ''
                    }`}
                    title={cell ? `Round ${cell.round}` : undefined}
                  >
                    {cell?.display || ''}
                  </td>
                );
              })}
              <td className="py-1 px-2 text-center font-bold">{row.points}</td>
            </tr>
          ))}
        </tbody>
      </table>
      </div>
    </div>
  );
}

function resultDisplay(result: string | null, side: 'white' | 'black'): string {
  if (!result) return '';
  switch (result) {
    case '1-0': return side === 'white' ? '1' : '0';
    case '0-1': return side === 'black' ? '1' : '0';
    case 'draw': return '½';
    case 'white_forfeit': return side === 'white' ? '+' : '-';
    case 'black_forfeit': return side === 'black' ? '+' : '-';
    case 'double_forfeit': return '-';
    case 'bye': return '+';
    case 'half_bye': return 'H';
    default: return '';
  }
}
