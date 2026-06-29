import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Opening quiz - KZN Chess' };

export default async function QuizPickerPage() {
  const user = await getCurrentUser();
  let reps: { id: string; name: string; color: string }[] = [];
  if (user) {
    const supabase = createServerClient();
    try {
      const { data } = await supabase
        .from('repertoires')
        .select('id, name, color')
        .eq('user_id', user.id)
        .order('created_at', { ascending: false });
      reps = data || [];
    } catch {
      reps = [];
    }
  }

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/learn/openings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Repertoires
        </Link>
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Opening <span className="text-primary">Quiz</span>
        </h1>
        <p className="text-muted-foreground mb-6">
          Spaced-repetition drilling — positions you miss come back sooner. Pick a
          repertoire to review.
        </p>

        {!user ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <p className="font-medium">Sign in to drill your repertoires.</p>
              <Link href="/auth" className="text-primary hover:underline text-sm">
                Go to sign in →
              </Link>
            </CardContent>
          </Card>
        ) : reps.length === 0 ? (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <p className="font-medium">No repertoires yet.</p>
              <Link href="/learn/openings" className="text-primary hover:underline text-sm">
                Build one first →
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-2">
            {reps.map((r) => (
              <Link key={r.id} href={`/learn/openings/quiz/${r.id}`} className="block">
                <Card className="hover:border-primary/30 transition-colors">
                  <CardContent className="flex items-center justify-between p-4">
                    <span className="font-medium">{r.name}</span>
                    <Badge variant="outline" className="capitalize">{r.color}</Badge>
                  </CardContent>
                </Card>
              </Link>
            ))}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
