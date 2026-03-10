'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { X } from 'lucide-react';
import { calculatePerformanceRating } from '@/lib/tournament/tiebreaks';
import type { PlayerStanding } from '@/lib/types';

interface PlayerCardProps {
  tournamentId: string;
  playerId: string;
  onClose: () => void;
}

export function PlayerCard({ tournamentId, playerId, onClose }: PlayerCardProps) {
  const [standing, setStanding] = useState<PlayerStanding | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchData = async () => {
      try {
        const res = await fetch(`/api/tournaments/${tournamentId}/standings`);
        if (res.ok) {
          const data = await res.json();
          const found = (data.standings || []).find((s: PlayerStanding) => s.player.id === playerId);
          setStanding(found || null);
        }
      } finally {
        setLoading(false);
      }
    };
    fetchData();
  }, [tournamentId, playerId]);

  if (loading) return <div className="py-4 text-center text-muted-foreground">Loading...</div>;
  if (!standing) return <div className="py-4 text-center text-muted-foreground">Player not found.</div>;

  const { player, points, games, rank } = standing;
  const perfRating = calculatePerformanceRating(games, points);

  return (
    <Card className="relative">
      <Button
        size="icon" variant="ghost"
        className="absolute top-2 right-2 h-8 w-8"
        onClick={onClose}
      >
        <X className="w-4 h-4" />
      </Button>
      <CardHeader className="pb-3">
        <CardTitle className="text-base pr-8">{player.player_name}</CardTitle>
        <div className="flex flex-wrap gap-1 mt-1">
          {player.fide_rating && (
            <Badge variant="outline" className="text-xs">FIDE: {player.fide_rating}</Badge>
          )}
          {player.national_rating && (
            <Badge variant="outline" className="text-xs">Nat: {player.national_rating}</Badge>
          )}
          {player.fide_id && (
            <Badge variant="secondary" className="text-xs">FIDE ID: {player.fide_id}</Badge>
          )}
          {player.chess_sa_id && (
            <Badge variant="secondary" className="text-xs">SA ID: {player.chess_sa_id}</Badge>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-3">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-2 text-xs">
          {player.club && <div><span className="text-muted-foreground">Club:</span> {player.club}</div>}
          {player.district && <div><span className="text-muted-foreground">District:</span> {player.district}</div>}
          <div><span className="text-muted-foreground">Category:</span> {player.age_category?.toUpperCase()}</div>
          {player.sex && <div><span className="text-muted-foreground">Sex:</span> {player.sex}</div>}
        </div>

        <div className="flex gap-4 text-sm">
          <div>
            <span className="text-muted-foreground">Rank:</span>{' '}
            <span className="font-bold">{rank}</span>
          </div>
          <div>
            <span className="text-muted-foreground">Score:</span>{' '}
            <span className="font-bold">{points}/{games.length}</span>
          </div>
          {perfRating && (
            <div>
              <span className="text-muted-foreground">Perf:</span>{' '}
              <span className="font-bold">{perfRating}</span>
            </div>
          )}
        </div>

        {/* Game-by-game breakdown */}
        {games.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-xs">
              <thead>
                <tr className="border-b border-border">
                  <th className="py-1 px-2 text-left">Rd</th>
                  <th className="py-1 px-2 text-left">Opponent</th>
                  <th className="py-1 px-2 text-center">Rtg</th>
                  <th className="py-1 px-2 text-center">Color</th>
                  <th className="py-1 px-2 text-center">Result</th>
                  <th className="py-1 px-2 text-center">Pts</th>
                </tr>
              </thead>
              <tbody>
                {games.map(g => (
                  <tr key={g.round_number} className="border-b border-border/50">
                    <td className="py-1 px-2">{g.round_number}</td>
                    <td className="py-1 px-2">{g.opponent_name || 'BYE'}</td>
                    <td className="py-1 px-2 text-center text-muted-foreground">
                      {g.opponent_rating || '-'}
                    </td>
                    <td className="py-1 px-2 text-center">
                      {g.color === 'W' ? '⬜' : g.color === 'B' ? '⬛' : '-'}
                    </td>
                    <td className="py-1 px-2 text-center">
                      {gameResultDisplay(g.result)}
                    </td>
                    <td className="py-1 px-2 text-center font-medium">{g.points}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function gameResultDisplay(result: string | null): string {
  if (!result) return '-';
  switch (result) {
    case '1-0': return '1-0';
    case '0-1': return '0-1';
    case 'draw': return '½-½';
    case 'white_forfeit': return '+−';
    case 'black_forfeit': return '−+';
    case 'double_forfeit': return '−−';
    case 'bye': return 'BYE';
    case 'half_bye': return '½BYE';
    default: return result;
  }
}
