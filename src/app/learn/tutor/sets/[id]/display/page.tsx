import { redirect, notFound } from 'next/navigation';
import { getTutor } from '@/lib/tutor/access';
import { createServerClient } from '@/lib/supabase/server';
import { ClassroomDisplay } from '@/components/tutor/classroom-display';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Classroom display - KZN Chess' };

export default async function ClassroomDisplayPage({ params }: { params: { id: string } }) {
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
    .select('sort_order, puzzle:puzzles(id, fen, moves, rating)')
    .eq('session_set_id', params.id)
    .order('sort_order');
  const puzzles = (rows || []).map((r: any) => r.puzzle).filter(Boolean);

  return <ClassroomDisplay setId={set.id} setName={set.name} puzzles={puzzles} />;
}
