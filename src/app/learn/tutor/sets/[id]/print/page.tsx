import { redirect, notFound } from 'next/navigation';
import { getTutor } from '@/lib/tutor/access';
import { createServerClient } from '@/lib/supabase/server';
import { PuzzleBoard } from '@/components/puzzles/puzzle-board';
import { TurnBanner } from '@/components/puzzles/turn-banner';
import { PrintButton } from '@/components/tutor/print-button';
import { puzzleDiagram, puzzleSolutionSan } from '@/lib/puzzles/diagram';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Print session set' };

export default async function PrintSetPage({ params }: { params: { id: string } }) {
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

  return (
    <div className="p-8 text-black bg-white min-h-screen">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h1 className="text-2xl font-bold">{set.name}</h1>
          {set.skill_level && <p className="text-sm text-gray-600">Level: {set.skill_level}</p>}
          <p className="text-sm text-gray-600">{puzzles.length} puzzles</p>
        </div>
        <PrintButton />
      </div>

      {puzzles.length === 0 ? (
        <p>No puzzles in this set.</p>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-8">
          {puzzles.map((p: any, i: number) => {
            const d = puzzleDiagram(p.fen, p.moves);
            const sans = puzzleSolutionSan(p.fen, p.moves);
            return (
              <div key={p.id} className="break-inside-avoid border border-gray-300 rounded-md p-4">
                <div className="flex items-center justify-between gap-2 mb-2">
                  <span className="font-bold">#{i + 1}</span>
                  <TurnBanner turn={d.turn} />
                  <span className="text-sm text-gray-600">{p.rating}</span>
                </div>
                <PuzzleBoard fen={d.fen} boardWidth={260} />
                <p className="text-sm mt-3">
                  <span className="font-semibold">Solution:</span> {sans.join('  ') || '—'}
                </p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
