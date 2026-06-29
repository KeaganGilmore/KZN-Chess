import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerClient();
  const { data: repertoire } = await supabase
    .from('repertoires')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!repertoire) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: nodes } = await supabase
    .from('repertoire_nodes')
    .select('id, parent_id, fen, move_san, move_uci, notes, tags')
    .eq('repertoire_id', params.id)
    .order('created_at');
  return NextResponse.json({ repertoire, nodes: nodes || [] });
}

export async function PATCH(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerClient();
  const body = await req.json().catch(() => ({}));
  const update: Record<string, any> = { updated_at: new Date().toISOString() };
  if (typeof body.name === 'string') update.name = body.name.trim();
  if (body.color === 'white' || body.color === 'black') update.color = body.color;
  const { data, error } = await supabase
    .from('repertoires')
    .update(update)
    .eq('id', params.id)
    .eq('user_id', user.id)
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ repertoire: data });
}

export async function DELETE(_req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerClient();
  const { error } = await supabase
    .from('repertoires')
    .delete()
    .eq('id', params.id)
    .eq('user_id', user.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
