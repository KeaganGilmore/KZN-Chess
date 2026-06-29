import { redirect } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getTutor } from '@/lib/tutor/access';
import { createServerClient } from '@/lib/supabase/server';
import { PageTransition } from '@/components/ui/page-transition';
import { PuzzleBrowser } from '@/components/tutor/puzzle-browser';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Browse puzzles - KZN Chess' };

export default async function TutorPuzzlesPage({
  searchParams,
}: {
  searchParams: { set?: string };
}) {
  const tutor = await getTutor();
  if (!tutor) redirect('/auth');

  const supabase = createServerClient();
  let sets: { id: string; name: string }[] = [];
  try {
    const { data } = await supabase
      .from('session_sets')
      .select('id, name')
      .eq('tutor_id', tutor.id)
      .order('created_at', { ascending: false });
    sets = data || [];
  } catch {
    sets = [];
  }

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/learn/tutor"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Tutor toolkit
        </Link>
        <h1 className="text-2xl font-bold mb-6">Browse puzzles</h1>
        <PuzzleBrowser initialSetId={searchParams.set} sets={sets} />
      </div>
    </PageTransition>
  );
}
