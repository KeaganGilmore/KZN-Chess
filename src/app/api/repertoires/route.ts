import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { START_FEN } from '@/lib/openings/tree';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerClient();
  const { data } = await supabase
    .from('repertoires')
    .select('*')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false });
  return NextResponse.json({ repertoires: data || [] });
}

export async function POST(req: NextRequest) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const body = await req.json().catch(() => ({}));
  if (!body.name?.trim()) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
  const color = body.color === 'black' ? 'black' : 'white';

  const supabase = createServerClient();
  const { data: rep, error } = await supabase
    .from('repertoires')
    .insert({ user_id: user.id, name: body.name.trim(), color })
    .select()
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Every repertoire starts with a root node (the initial position).
  await supabase.from('repertoire_nodes').insert({
    repertoire_id: rep.id,
    parent_id: null,
    fen: START_FEN,
    move_san: null,
    move_uci: null,
  });

  return NextResponse.json({ repertoire: rep });
}
