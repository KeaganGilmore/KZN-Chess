import Link from 'next/link';
import { Play } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { PuzzleBoard } from '@/components/puzzles/puzzle-board';

export const metadata = { title: 'Puzzles - KZN Chess' };
export const dynamic = 'force-dynamic';

interface PuzzleRow {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
}

async function getData() {
  try {
    const supabase = createServerClient();
    const user = await getCurrentUser();
    const { data, error } = await supabase
      .from('puzzles')
      .select('id, fen, moves, rating, themes')
      .order('popularity', { ascending: false })
      .limit(12);
    if (error) throw error;

    let stats = null;
    if (user) {
      const { data: s } = await supabase
        .from('player_puzzle_stats')
        .select('rating, solved, current_streak, best_streak')
        .eq('user_id', user.id)
        .maybeSingle();
      stats = s || null;
    }
    return { puzzles: (data || []) as PuzzleRow[], stats };
  } catch (err) {
    console.error('Puzzles page getData failed:', err);
    return { puzzles: [] as PuzzleRow[], stats: null };
  }
}

export default async function PuzzlesPage() {
  const { puzzles, stats } = await getData();
  const featured = puzzles[0];

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-3xl sm:text-4xl font-bold mb-2">
              Puzzle <span className="text-primary">Library</span>
            </h1>
            <p className="text-muted-foreground">
              Train tactics from the Lichess puzzle database. Your rating adjusts
              as you solve.
            </p>
          </div>
          {featured && (
            <Link href={`/learn/puzzles/${featured.id}`}>
              <Button size="lg">
                <Play className="w-4 h-4 mr-2" /> Start training
              </Button>
            </Link>
          )}
        </div>

        {stats && (
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-8">
            {[
              ['Rating', stats.rating],
              ['Solved', stats.solved],
              ['Streak', stats.current_streak],
              ['Best streak', stats.best_streak],
            ].map(([label, value]) => (
              <Card key={label as string}>
                <CardContent className="p-4">
                  <p className="text-2xl font-bold">{value as number}</p>
                  <p className="text-xs text-muted-foreground">{label as string}</p>
                </CardContent>
              </Card>
            ))}
          </div>
        )}

        {featured ? (
          <div className="grid lg:grid-cols-2 gap-8">
            <Card>
              <CardContent className="pt-6 space-y-4">
                <Link href={`/learn/puzzles/${featured.id}`} className="block">
                  <PuzzleBoard fen={featured.fen} />
                </Link>
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Rating {featured.rating}</Badge>
                  {featured.themes.slice(0, 6).map((t) => (
                    <Badge key={t} variant="outline" className="capitalize">
                      {t}
                    </Badge>
                  ))}
                </div>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-sm font-heading font-semibold mb-3 text-muted-foreground">
                More puzzles
              </h2>
              <div className="space-y-2">
                {puzzles.slice(1).map((p) => (
                  <Link key={p.id} href={`/learn/puzzles/${p.id}`} className="block">
                    <Card className="hover:border-primary/30 transition-colors">
                      <CardContent className="flex items-center justify-between gap-3 p-3">
                        <div className="min-w-0">
                          <p className="font-medium text-sm">#{p.id}</p>
                          <p className="text-xs text-muted-foreground truncate capitalize">
                            {p.themes.slice(0, 4).join(', ')}
                          </p>
                        </div>
                        <Badge variant="outline" className="shrink-0">
                          {p.rating}
                        </Badge>
                      </CardContent>
                    </Card>
                  </Link>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <p className="font-medium">No puzzles imported yet.</p>
              <p className="text-sm text-muted-foreground">
                Apply <code>supabase/migrations/003_puzzles.sql</code> and{' '}
                <code>004_puzzle_progress.sql</code>, then run the importer:
              </p>
              <pre className="text-xs bg-muted rounded-md p-3 inline-block text-left overflow-x-auto">
                node scripts/import-puzzles.mjs lichess_db_puzzle.csv.zst --limit 5000
              </pre>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
