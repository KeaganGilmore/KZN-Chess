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

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const tutor = await getTutor();
  if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const supabase = createServerClient();
  const { data: set } = await supabase
    .from('session_sets')
    .select('*')
    .eq('id', params.id)
    .eq('tutor_id', tutor.id)
    .maybeSingle();
  if (!set) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: rows } = await supabase
    .from('session_set_puzzles')
    .select('sort_order, puzzle:puzzles(id, fen, moves, rating, themes)')
    .eq('session_set_id', params.id)
    .order('sort_order');
  const puzzles = (rows || []).map((r: any) => ({ ...r.puzzle, sort_order: r.sort_order }));
  return NextResponse.json({ set, puzzles });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const tutor = await getTutor();
  if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const supabase = createServerClient();
  if (!(await ownsSet(supabase, params.id, tutor.id)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const f of ['name', 'skill_level', 'notes']) {
    if (f in body) update[f] = body[f]?.trim?.() || null;
  }
  const { data, error } = await supabase
    .from('session_sets')
    .update(update)
    .eq('id', params.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ set: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const tutor = await getTutor();
  if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const supabase = createServerClient();
  const { error } = await supabase
    .from('session_sets')
    .delete()
    .eq('id', params.id)
    .eq('tutor_id', tutor.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
