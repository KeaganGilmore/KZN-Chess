import Link from 'next/link';
import { notFound } from 'next/navigation';
import { ArrowLeft } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { PuzzleSolver, type SolverPuzzle } from '@/components/puzzles/puzzle-solver';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Solve puzzle - KZN Chess' };

async function getData(id: string) {
  try {
    const supabase = createServerClient();
    const user = await getCurrentUser();
    const { data: puzzle } = await supabase
      .from('puzzles')
      .select('id, fen, moves, rating, themes')
      .eq('id', id)
      .maybeSingle();

    let stats = null;
    if (user && puzzle) {
      const { data } = await supabase
        .from('player_puzzle_stats')
        .select('*')
        .eq('user_id', user.id)
        .maybeSingle();
      stats = data || null;
    }
    return { puzzle: (puzzle as SolverPuzzle) || null, isAuthed: !!user, stats };
  } catch (err) {
    console.error('Puzzle page getData failed:', err);
    return { puzzle: null, isAuthed: false, stats: null };
  }
}

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div>
      <p className="text-2xl font-bold">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function PuzzlePage({ params }: { params: { id: string } }) {
  const { puzzle, isAuthed, stats } = await getData(params.id);
  if (!puzzle) notFound();

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/learn/puzzles"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="w-4 h-4" /> Puzzle library
        </Link>

        <div className="grid lg:grid-cols-[auto_1fr] gap-8 mt-4">
          <Card>
            <CardContent className="pt-6">
              <PuzzleSolver puzzle={puzzle} isAuthed={isAuthed} />
            </CardContent>
          </Card>

          <div className="space-y-4">
            {stats ? (
              <Card>
                <CardHeader>
                  <CardTitle className="text-base">Your progress</CardTitle>
                </CardHeader>
                <CardContent className="grid grid-cols-2 gap-4">
                  <Stat label="Rating" value={stats.rating} />
                  <Stat label="Solved" value={stats.solved} />
                  <Stat label="Current streak" value={stats.current_streak} />
                  <Stat label="Best streak" value={stats.best_streak} />
                </CardContent>
              </Card>
            ) : isAuthed ? (
              <Card>
                <CardContent className="py-6 text-sm text-muted-foreground">
                  Solve your first puzzle to start tracking your rating and streak.
                </CardContent>
              </Card>
            ) : null}
          </div>
        </div>
      </div>
    </PageTransition>
  );
}
