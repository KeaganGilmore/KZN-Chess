import { createServerClient } from '@/lib/supabase/server';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { PuzzleBoard } from '@/components/puzzles/puzzle-board';

export const metadata = { title: 'Puzzles - KZN Chess' };

// Reads live DB data; never prerender.
export const dynamic = 'force-dynamic';

interface PuzzleRow {
  id: string;
  fen: string;
  moves: string;
  rating: number;
  themes: string[];
}

async function getPuzzles(): Promise<PuzzleRow[]> {
  try {
    const supabase = createServerClient();
    const { data, error } = await supabase
      .from('puzzles')
      .select('id, fen, moves, rating, themes')
      .order('popularity', { ascending: false })
      .limit(12);
    if (error) throw error;
    return (data || []) as PuzzleRow[];
  } catch (err) {
    console.error('Puzzles page getData failed:', err);
    return [];
  }
}

export default async function PuzzlesPage() {
  const puzzles = await getPuzzles();
  const featured = puzzles[0];

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl sm:text-4xl font-bold mb-2">
            Puzzle <span className="text-primary">Library</span>
          </h1>
          <p className="text-muted-foreground">
            Browse tactics from the Lichess puzzle database. Filtering by theme,
            difficulty and skill level, plus session prep, comes next.
          </p>
        </div>

        {featured ? (
          <div className="grid lg:grid-cols-2 gap-8">
            <Card>
              <CardHeader>
                <CardTitle className="text-base">Puzzle #{featured.id}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <PuzzleBoard fen={featured.fen} />
                <div className="flex flex-wrap items-center gap-2">
                  <Badge variant="outline">Rating {featured.rating}</Badge>
                  {featured.themes.slice(0, 6).map((t) => (
                    <Badge key={t} variant="outline" className="capitalize">
                      {t}
                    </Badge>
                  ))}
                </div>
                <p className="text-xs text-muted-foreground">
                  Read-only preview — solving and move entry arrive in a later phase.
                </p>
              </CardContent>
            </Card>

            <div>
              <h2 className="text-sm font-heading font-semibold mb-3 text-muted-foreground">
                More puzzles
              </h2>
              <div className="space-y-2">
                {puzzles.slice(1).map((p) => (
                  <Card key={p.id}>
                    <CardContent className="flex items-center justify-between gap-3 p-3">
                      <div className="min-w-0">
                        <p className="font-medium text-sm">#{p.id}</p>
                        <p className="text-xs text-muted-foreground truncate">
                          {p.themes.slice(0, 4).join(', ')}
                        </p>
                      </div>
                      <Badge variant="outline" className="shrink-0">
                        {p.rating}
                      </Badge>
                    </CardContent>
                  </Card>
                ))}
              </div>
            </div>
          </div>
        ) : (
          <Card>
            <CardContent className="py-12 text-center space-y-3">
              <p className="font-medium">No puzzles imported yet.</p>
              <p className="text-sm text-muted-foreground">
                Apply <code>supabase/migrations/003_puzzles.sql</code>, then run the
                importer:
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
