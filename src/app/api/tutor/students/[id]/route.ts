import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getTutor } from '@/lib/tutor/access';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const tutor = await getTutor();
  if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const supabase = createServerClient();
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', params.id)
    .eq('tutor_id', tutor.id)
    .maybeSingle();
  if (!student) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: logs } = await supabase
    .from('student_session_logs')
    .select('*, set:session_sets(id, name)')
    .eq('student_id', params.id)
    .order('session_date', { ascending: false });
  return NextResponse.json({ student, logs: logs || [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const tutor = await getTutor();
  if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const supabase = createServerClient();
  const body = await req.json().catch(() => ({}));
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  for (const f of ['name', 'skill_level', 'notes']) {
    if (f in body) update[f] = body[f]?.trim?.() || null;
  }
  const { data, error } = await supabase
    .from('students')
    .update(update)
    .eq('id', params.id)
    .eq('tutor_id', tutor.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ student: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const tutor = await getTutor();
  if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const supabase = createServerClient();
  const { error } = await supabase
    .from('students')
    .delete()
    .eq('id', params.id)
    .eq('tutor_id', tutor.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
