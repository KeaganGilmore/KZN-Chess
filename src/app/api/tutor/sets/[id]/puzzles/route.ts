import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getTutor } from '@/lib/tutor/access';

async function ownsSet(supabase: any, setId: string, tutorId: string) {
  const { data } = await supabase
    .from('session_sets')
    .select('id')
    .eq('id', setId)
    .eq('tutor_id', tutorId)
    .maybeSingle();
  return !!data;
}

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const tutor = await getTutor();
  if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const supabase = createServerClient();
  if (!(await ownsSet(supabase, params.id, tutor.id)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (!body.puzzle_id) return NextResponse.json({ error: 'puzzle_id required' }, { status: 400 });

  const { data: last } = await supabase
    .from('session_set_puzzles')
    .select('sort_order')
    .eq('session_set_id', params.id)
    .order('sort_order', { ascending: false })
    .limit(1)
    .maybeSingle();
  const sortOrder = (last?.sort_order ?? -1) + 1;

  const { error } = await supabase.from('session_set_puzzles').upsert(
    { session_set_id: params.id, puzzle_id: body.puzzle_id, sort_order: sortOrder },
    { onConflict: 'session_set_id,puzzle_id', ignoreDuplicates: true }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}

export async function DELETE(req: NextRequest, { params }: { params: { id: string } }) {
  const tutor = await getTutor();
  if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const supabase = createServerClient();
  if (!(await ownsSet(supabase, params.id, tutor.id)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const puzzleId = new URL(req.url).searchParams.get('puzzle_id');
  if (!puzzleId) return NextResponse.json({ error: 'puzzle_id required' }, { status: 400 });
  const { error } = await supabase
    .from('session_set_puzzles')
    .delete()
    .eq('session_set_id', params.id)
    .eq('puzzle_id', puzzleId);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
