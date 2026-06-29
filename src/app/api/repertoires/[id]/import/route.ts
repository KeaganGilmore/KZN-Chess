import { NextRequest, NextResponse } from 'next/server';
import { Chess } from 'chess.js';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { START_FEN } from '@/lib/openings/tree';

// Import a PGN mainline into the repertoire tree, chaining find-or-insert from
// the root so shared opening moves are reused, not duplicated.
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
  if (!body.pgn?.trim()) return NextResponse.json({ error: 'PGN is required' }, { status: 400 });

  const game = new Chess();
  try {
    game.loadPgn(body.pgn);
  } catch {
    return NextResponse.json({ error: 'Could not parse PGN' }, { status: 400 });
  }
  const moves = game.history({ verbose: true });
  if (moves.length === 0) return NextResponse.json({ added: 0 });

  // Ensure a root node exists.
  let { data: root } = await supabase
    .from('repertoire_nodes')
    .select('id')
    .eq('repertoire_id', params.id)
    .is('parent_id', null)
    .maybeSingle();
  if (!root) {
    const ins = await supabase
      .from('repertoire_nodes')
      .insert({ repertoire_id: params.id, parent_id: null, fen: START_FEN })
      .select('id')
      .single();
    root = ins.data;
  }

  let parentId = root!.id as string;
  let added = 0;
  const replay = new Chess();
  for (const mv of moves) {
    const m = replay.move(mv.san);
    if (!m) break;
    const uci = `${m.from}${m.to}${m.promotion || ''}`;
    const fen = replay.fen();
    const { data: existing } = await supabase
      .from('repertoire_nodes')
      .select('id')
      .eq('repertoire_id', params.id)
      .eq('parent_id', parentId)
      .eq('move_uci', uci)
      .maybeSingle();
    if (existing) {
      parentId = existing.id;
      continue;
    }
    const { data: node, error } = await supabase
      .from('repertoire_nodes')
      .insert({ repertoire_id: params.id, parent_id: parentId, fen, move_san: m.san, move_uci: uci })
      .select('id')
      .single();
    if (error || !node) break;
    parentId = node.id;
    added++;
  }

  return NextResponse.json({ added });
}
