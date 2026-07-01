import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

async function owns(supabase: any, repId: string, userId: string) {
  const { data } = await supabase
    .from('repertoires')
    .select('id')
    .eq('id', repId)
    .eq('user_id', userId)
    .maybeSingle();
  return !!data;
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerClient();
  if (!(await owns(supabase, params.id, user.id)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const body = await req.json().catch(() => ({}));
  const update: Record<string, any> = {};
  if ('notes' in body) update.notes = body.notes?.trim() || null;
  if ('comment_before' in body) update.comment_before = body.comment_before?.trim() || null;
  if ('comment_after' in body) update.comment_after = body.comment_after?.trim() || null;
  if ('tags' in body) {
    update.tags = Array.isArray(body.tags)
      ? body.tags.map((t: string) => t.trim()).filter(Boolean)
      : [];
  }
  if ('arrows' in body) {
    update.arrows = Array.isArray(body.arrows)
      ? body.arrows
          .filter((a: any) => a && typeof a.from === 'string' && typeof a.to === 'string')
          .map((a: any) => ({ from: a.from, to: a.to, color: a.color || 'green' }))
      : [];
  }
  const { data, error } = await supabase
    .from('repertoire_nodes')
    .update(update)
    .eq('id', params.nodeId)
    .eq('repertoire_id', params.id)
    .select('id, parent_id, fen, move_san, move_uci, notes, tags, comment_before, comment_after, arrows')
    .single();
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ node: data });
}

export async function DELETE(
  _req: NextRequest,
  { params }: { params: { id: string; nodeId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerClient();
  if (!(await owns(supabase, params.id, user.id)))
    return NextResponse.json({ error: 'Not found' }, { status: 404 });

  // Don't allow deleting the root node.
  const { data: node } = await supabase
    .from('repertoire_nodes')
    .select('parent_id')
    .eq('id', params.nodeId)
    .eq('repertoire_id', params.id)
    .maybeSingle();
  if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });
  if (node.parent_id === null)
    return NextResponse.json({ error: 'Cannot delete the root position' }, { status: 400 });

  const { error } = await supabase
    .from('repertoire_nodes')
    .delete()
    .eq('id', params.nodeId)
    .eq('repertoire_id', params.id);
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
