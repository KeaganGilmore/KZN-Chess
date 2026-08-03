'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Trash2 } from 'lucide-react';
import { PuzzleBoard } from '@/components/puzzles/puzzle-board';
import { TurnBanner } from '@/components/puzzles/turn-banner';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { puzzleDiagram } from '@/lib/puzzles/diagram';

interface P {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
}

export function SetPuzzleList({ setId, puzzles }: { setId: string; puzzles: P[] }) {
  const router = useRouter();
  const [busy, setBusy] = useState<string | null>(null);

  const remove = async (pid: string) => {
    setBusy(pid);
    await fetch(`/api/tutor/sets/${setId}/puzzles?puzzle_id=${pid}`, { method: 'DELETE' });
    router.refresh();
    setBusy(null);
  };

  if (puzzles.length === 0)
    return <p className="text-sm text-muted-foreground">No puzzles in this set yet.</p>;

  return (
    <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
      {puzzles.map((p) => {
        const d = puzzleDiagram(p.fen, p.moves);
        return (
        <Card key={p.id}>
          <CardContent className="p-4 space-y-3">
            <TurnBanner turn={d.turn} className="max-w-[220px]" />
            <PuzzleBoard fen={d.fen} boardWidth={220} />
            <div className="flex items-center justify-between">
              <div className="flex flex-wrap gap-1.5">
                <Badge variant="outline">{p.rating}</Badge>
                {p.themes.slice(0, 2).map((t) => (
                  <Badge key={t} variant="outline" className="capitalize text-[10px]">
                    {t}
                  </Badge>
                ))}
              </div>
              <Button variant="ghost" size="icon" className="h-11 w-11" onClick={() => remove(p.id)} disabled={busy === p.id}>
                <Trash2 className="w-4 h-4 text-muted-foreground" />
              </Button>
            </div>
          </CardContent>
        </Card>
        );
      })}
    </div>
  );
}
