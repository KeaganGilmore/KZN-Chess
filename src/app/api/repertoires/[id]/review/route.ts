import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { grade, isWeakSpot } from '@/lib/openings/spaced-repetition';

function turn(fen: string): 'white' | 'black' {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white';
}

/**
 * Build the review queue. Each player-move node is its own SR card: the board
 * starts from the PARENT position (drop-in "random position"), and the answer
 * is that node's move.
 *   ?mode=due  (default) — cards whose next_review_at <= now (+ never-seen),
 *                          most overdue first.
 *   ?mode=weak            — weak spots (fail_count>=3 or reset-after-fail),
 *                          worst first.
 */
export async function GET(req: NextRequest, { params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  const supabase = createServerClient();

  const { data: rep } = await supabase
    .from('repertoires')
    .select('id, color')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!rep) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const mode = new URL(req.url).searchParams.get('mode') === 'weak' ? 'weak' : 'due';

  const { data: nodes } = await supabase
    .from('repertoire_nodes')
    .select('id, parent_id, fen, move_uci, move_san, comment_after, arrows')
    .eq('repertoire_id', params.id);
  const all = nodes || [];
  const byId = new Map(all.map((n) => [n.id, n]));

  // Player-move card = a node whose PARENT position has the player to move.
  const cards = all
    .filter((n) => n.parent_id && n.move_uci)
    .map((n) => {
      const parent = byId.get(n.parent_id!);
      if (!parent || turn(parent.fen) !== rep.color) return null;
      return {
        node_id: n.id,
        start_fen: parent.fen,
        answer_uci: n.move_uci as string,
        move_san: n.move_san,
        comment_after: n.comment_after ?? null,
        arrows: n.arrows ?? [],
      };
    })
    .filter(Boolean) as Array<{
    node_id: string;
    start_fen: string;
    answer_uci: string;
    move_san: string | null;
    comment_after: string | null;
    arrows: any[];
  }>;

  const nodeIds = cards.map((c) => c.node_id);
  const { data: reviews } = await supabase
    .from('node_reviews')
    .select('node_id, sr_level, next_review_at, fail_count, success_count')
    .eq('user_id', user.id)
    .in('node_id', nodeIds.length ? nodeIds : ['none']);
  const reviewByNode = new Map((reviews || []).map((r) => [r.node_id, r]));

  const now = Date.now();
  const enriched = cards.map((c) => {
    const r = reviewByNode.get(c.node_id) || null;
    return {
      ...c,
      sr_level: r?.sr_level ?? 0,
      fail_count: r?.fail_count ?? 0,
      due_at: r ? new Date(r.next_review_at).getTime() : 0, // new cards are due now
      seen: !!r,
    };
  });

  let queue;
  if (mode === 'weak') {
    queue = enriched
      .filter((c) => c.seen && isWeakSpot(c))
      .sort((a, b) => b.fail_count - a.fail_count);
  } else {
    queue = enriched
      .filter((c) => !c.seen || c.due_at <= now)
      .sort((a, b) => a.due_at - b.due_at); // most overdue first; new cards (0) first
  }

  const items = queue.slice(0, 30).map(({ due_at, seen, ...item }) => item);
  return NextResponse.json({ items, color: rep.color, mode });
}

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
  const { node_id, correct } = body;
  if (!node_id) return NextResponse.json({ error: 'node_id required' }, { status: 400 });

  const { data: node } = await supabase
    .from('repertoire_nodes')
    .select('id')
    .eq('id', node_id)
    .eq('repertoire_id', params.id)
    .maybeSingle();
  if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: prev } = await supabase
    .from('node_reviews')
    .select('sr_level, fail_count, success_count')
    .eq('user_id', user.id)
    .eq('node_id', node_id)
    .maybeSingle();

  const result = grade(prev?.sr_level ?? 0, !!correct);
  const now = Date.now();
  const { error } = await supabase.from('node_reviews').upsert(
    {
      user_id: user.id,
      node_id,
      sr_level: result.level,
      next_review_at: new Date(now + result.nextReviewMs).toISOString(),
      fail_count: (prev?.fail_count ?? 0) + (correct ? 0 : 1),
      success_count: (prev?.success_count ?? 0) + (correct ? 1 : 0),
      last_reviewed_at: new Date(now).toISOString(),
    },
    { onConflict: 'user_id,node_id' }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, level: result.level });
}
