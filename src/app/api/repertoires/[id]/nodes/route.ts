import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

const NODE_COLS =
  'id, parent_id, fen, move_san, move_uci, notes, tags, comment_before, comment_after, arrows';

export async function POST(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerClient();

  const { data: rep } = await supabase
    .from('repertoires')
    .select('id')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!rep) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  if (!body.fen || !body.move_uci || !body.parent_id) {
    return NextResponse.json({ error: 'parent_id, fen and move_uci are required' }, { status: 400 });
  }

  // Find-or-create so re-playing an existing line doesn't duplicate nodes.
  const { data: existing } = await supabase
    .from('repertoire_nodes')
    .select(NODE_COLS)
    .eq('repertoire_id', params.id)
    .eq('parent_id', body.parent_id)
    .eq('move_uci', body.move_uci)
    .maybeSingle();
  if (existing) return NextResponse.json({ node: existing });

  const { data, error } = await supabase
    .from('repertoire_nodes')
    .insert({
      repertoire_id: params.id,
      parent_id: body.parent_id,
      fen: body.fen,
      move_san: body.move_san || null,
      move_uci: body.move_uci,
    })
    .select(NODE_COLS)
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ node: data });
}
