import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { schedule, priority } from '@/lib/openings/srs';

function turn(fen: string): 'white' | 'black' {
  return fen.split(' ')[1] === 'b' ? 'black' : 'white';
}

// Build the review queue: positions where it's the player's move and the
// repertoire has a continuation, ordered by spaced-repetition priority.
export async function GET(_req: NextRequest, { params }: { params: { id: string } }) {
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

  const { data: nodes } = await supabase
    .from('repertoire_nodes')
    .select('id, parent_id, fen, move_uci, move_san')
    .eq('repertoire_id', params.id);
  const all = nodes || [];

  const childrenByParent = new Map<string, typeof all>();
  for (const n of all) {
    if (!n.parent_id) continue;
    const list = childrenByParent.get(n.parent_id) || [];
    list.push(n);
    childrenByParent.set(n.parent_id, list);
  }

  const nodeIds = all.map((n) => n.id);
  const { data: reviews } = await supabase
    .from('opening_reviews')
    .select('node_id, failures, successes, due_at')
    .eq('user_id', user.id)
    .in('node_id', nodeIds.length ? nodeIds : ['none']);
  const reviewByNode = new Map((reviews || []).map((r) => [r.node_id, r]));

  const now = Date.now();
  const quizzable = all
    .filter((n) => turn(n.fen) === rep.color && (childrenByParent.get(n.id)?.length ?? 0) > 0)
    .map((n) => {
      const kids = childrenByParent.get(n.id) || [];
      const review = reviewByNode.get(n.id) || null;
      return {
        node_id: n.id,
        fen: n.fen,
        answers: kids.map((k) => k.move_uci),
        answer_sans: kids.map((k) => k.move_san),
        weight: priority(review, now),
      };
    })
    .sort((a, b) => b.weight - a.weight)
    .slice(0, 20)
    .map(({ weight, ...item }) => item);

  return NextResponse.json({ items: quizzable, color: rep.color });
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

  // Confirm the node belongs to this repertoire.
  const { data: node } = await supabase
    .from('repertoire_nodes')
    .select('id')
    .eq('id', node_id)
    .eq('repertoire_id', params.id)
    .maybeSingle();
  if (!node) return NextResponse.json({ error: 'Not found' }, { status: 404 });

  const { data: prev } = await supabase
    .from('opening_reviews')
    .select('reps, ease, interval_days, successes, failures')
    .eq('user_id', user.id)
    .eq('node_id', node_id)
    .maybeSingle();

  const next = schedule(prev ? { reps: prev.reps, ease: prev.ease, interval_days: prev.interval_days } : null, !!correct);
  const now = Date.now();
  const { error } = await supabase.from('opening_reviews').upsert(
    {
      user_id: user.id,
      node_id,
      reps: next.reps,
      ease: next.ease,
      interval_days: next.interval_days,
      successes: (prev?.successes ?? 0) + (correct ? 1 : 0),
      failures: (prev?.failures ?? 0) + (correct ? 0 : 1),
      last_reviewed_at: new Date(now).toISOString(),
      due_at: new Date(now + next.dueOffsetMs).toISOString(),
    },
    { onConflict: 'user_id,node_id' }
  );
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
