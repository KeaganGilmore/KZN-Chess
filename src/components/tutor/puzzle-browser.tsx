'use client';

import { useEffect, useState } from 'react';
import { Search, Plus, Check } from 'lucide-react';
import { PuzzleBoard } from '@/components/puzzles/puzzle-board';
import { Card, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';

const THEMES = [
  'fork', 'pin', 'skewer', 'discoveredAttack', 'hangingPiece', 'sacrifice',
  'mate', 'mateIn1', 'mateIn2', 'mateIn3', 'backRankMate', 'endgame',
  'middlegame', 'opening', 'rookEndgame', 'pawnEndgame', 'promotion',
  'deflection', 'attraction', 'clearance', 'intermezzo', 'zugzwang',
  'trappedPiece', 'defensiveMove', 'quietMove', 'crushing', 'advantage',
];

interface Puzzle {
  id: string;
  fen: string;
  rating: number;
  themes: string[];
}

export function PuzzleBrowser({
  initialSetId,
  sets,
}: {
  initialSetId?: string;
  sets: { id: string; name: string }[];
}) {
  const [theme, setTheme] = useState('');
  const [min, setMin] = useState('');
  const [max, setMax] = useState('');
  const [puzzles, setPuzzles] = useState<Puzzle[]>([]);
  const [loading, setLoading] = useState(false);
  const [targetSet, setTargetSet] = useState(initialSetId || sets[0]?.id || '');
  const [added, setAdded] = useState<Record<string, boolean>>({});

  const search = async () => {
    setLoading(true);
    const p = new URLSearchParams({ limit: '24' });
    if (theme) p.set('theme', theme);
    if (min) p.set('min', min);
    if (max) p.set('max', max);
    const r = await fetch(`/api/tutor/puzzles?${p}`).then((x) => x.json()).catch(() => ({ puzzles: [] }));
    setPuzzles(r.puzzles || []);
    setLoading(false);
  };
  useEffect(() => {
    search();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const addToSet = async (puzzleId: string) => {
    if (!targetSet) return;
    await fetch(`/api/tutor/sets/${targetSet}/puzzles`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ puzzle_id: puzzleId }),
    });
    setAdded((a) => ({ ...a, [puzzleId]: true }));
  };

  return (
    <div className="space-y-6">
      <Card>
        <CardContent className="p-4 flex flex-wrap gap-3 items-end">
          <div className="space-y-1">
            <label className="text-xs text-muted-foreground">Theme</label>
            <select
              value={theme}
              onChange={(e) => setTheme(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-44"
            >
              <option value="">Any theme</option>
              {THEMES.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          </div>
          <div className="space-y-1 w-28">
            <label className="text-xs text-muted-foreground">Min rating</label>
            <Input type="number" value={min} onChange={(e) => setMin(e.target.value)} placeholder="1000" />
          </div>
          <div className="space-y-1 w-28">
            <label className="text-xs text-muted-foreground">Max rating</label>
            <Input type="number" value={max} onChange={(e) => setMax(e.target.value)} placeholder="1600" />
          </div>
          <Button onClick={search} disabled={loading}>
            <Search className="w-4 h-4 mr-1.5" />
            {loading ? 'Searching…' : 'Search'}
          </Button>
          <div className="space-y-1 ml-auto">
            <label className="text-xs text-muted-foreground">Add to set</label>
            <select
              value={targetSet}
              onChange={(e) => setTargetSet(e.target.value)}
              className="h-9 rounded-md border border-input bg-background px-3 text-sm w-52"
            >
              {sets.length === 0 && <option value="">No sets — create one first</option>}
              {sets.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name}
                </option>
              ))}
            </select>
          </div>
        </CardContent>
      </Card>

      {puzzles.length === 0 ? (
        <p className="text-sm text-muted-foreground">
          {loading ? 'Loading…' : 'No puzzles match — import the library or widen the filters.'}
        </p>
      ) : (
        <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
          {puzzles.map((p) => (
            <Card key={p.id}>
              <CardContent className="p-4 space-y-3">
                <PuzzleBoard fen={p.fen} boardWidth={220} />
                <div className="flex flex-wrap items-center gap-1.5">
                  <Badge variant="outline">{p.rating}</Badge>
                  {p.themes.slice(0, 3).map((t) => (
                    <Badge key={t} variant="outline" className="capitalize text-[10px]">
                      {t}
                    </Badge>
                  ))}
                </div>
                <Button
                  size="sm"
                  variant={added[p.id] ? 'outline' : 'default'}
                  className="w-full"
                  disabled={!targetSet || added[p.id]}
                  onClick={() => addToSet(p.id)}
                >
                  {added[p.id] ? (
                    <>
                      <Check className="w-4 h-4 mr-1.5" /> Added
                    </>
                  ) : (
                    <>
                      <Plus className="w-4 h-4 mr-1.5" /> Add to set
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
