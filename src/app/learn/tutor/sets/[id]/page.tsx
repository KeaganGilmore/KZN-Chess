import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft, Plus, Printer } from 'lucide-react';
import { getTutor } from '@/lib/tutor/access';
import { createServerClient } from '@/lib/supabase/server';
import { PageTransition } from '@/components/ui/page-transition';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { SetPuzzleList } from '@/components/tutor/set-puzzle-list';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Session set - KZN Chess' };

export default async function SetPage({ params }: { params: { id: string } }) {
  const tutor = await getTutor();
  if (!tutor) redirect('/auth');

  const supabase = createServerClient();
  const { data: set } = await supabase
    .from('session_sets')
    .select('*')
    .eq('id', params.id)
    .eq('tutor_id', tutor.id)
    .maybeSingle();
  if (!set) notFound();

  const { data: rows } = await supabase
    .from('session_set_puzzles')
    .select('sort_order, puzzle:puzzles(id, fen, rating, themes)')
    .eq('session_set_id', params.id)
    .order('sort_order');
  const puzzles = (rows || []).map((r: any) => r.puzzle).filter(Boolean);

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/learn/tutor"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Tutor toolkit
        </Link>

        <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
          <div>
            <h1 className="text-2xl font-bold flex items-center gap-3">
              {set.name}
              {set.skill_level && <Badge variant="outline">{set.skill_level}</Badge>}
            </h1>
            {set.notes && <p className="text-sm text-muted-foreground mt-1">{set.notes}</p>}
            <p className="text-sm text-muted-foreground mt-1">
              {puzzles.length} puzzle{puzzles.length === 1 ? '' : 's'}
            </p>
          </div>
          <div className="flex gap-2">
            <Link href={`/learn/tutor/puzzles?set=${set.id}`}>
              <Button variant="outline" size="sm">
                <Plus className="w-4 h-4 mr-1.5" /> Add puzzles
              </Button>
            </Link>
            <Link href={`/learn/tutor/sets/${set.id}/print`} target="_blank">
              <Button size="sm">
                <Printer className="w-4 h-4 mr-1.5" /> Print / export
              </Button>
            </Link>
          </div>
        </div>

        <SetPuzzleList setId={set.id} puzzles={puzzles} />
      </div>
    </PageTransition>
  );
}
