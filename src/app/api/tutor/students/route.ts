import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getTutor } from '@/lib/tutor/access';

export async function GET() {
  const tutor = await getTutor();
  if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('students')
    .select('*')
    .eq('tutor_id', tutor.id)
    .order('name');
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ students: data || [] });
}

export async function POST(req: NextRequest) {
  const tutor = await getTutor();
  if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  const body = await req.json().catch(() => ({}));
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('students')
    .insert({
      tutor_id: tutor.id,
      name: body.name.trim(),
      skill_level: body.skill_level?.trim() || null,
      notes: body.notes?.trim() || null,
    })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ student: data });
}
