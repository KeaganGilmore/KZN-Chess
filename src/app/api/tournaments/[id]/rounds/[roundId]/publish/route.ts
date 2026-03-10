import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { requireTournamentManager } from '@/lib/tournament/access';
import type { RoundStatus } from '@/lib/types';

export async function POST(
  request: Request,
  { params }: { params: { id: string; roundId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requireTournamentManager(params.id, user.id, user.role);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { status } = body as { status: RoundStatus };

  const validTransitions: Record<string, string[]> = {
    not_started: ['pairings_published'],
    pairings_published: ['in_progress', 'not_started'],
    in_progress: ['results_published'],
    results_published: ['in_progress'], // allow correction
  };

  const supabase = createServerClient();

  const { data: round } = await supabase
    .from('tournament_rounds')
    .select('status')
    .eq('id', params.roundId)
    .single();

  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });

  const allowed = validTransitions[round.status] || [];
  if (!allowed.includes(status)) {
    return NextResponse.json({
      error: `Cannot transition from ${round.status} to ${status}`,
    }, { status: 400 });
  }

  const updates: Record<string, unknown> = { status };
  if (status === 'pairings_published') {
    updates.published_at = new Date().toISOString();
  }

  const { data, error } = await supabase
    .from('tournament_rounds')
    .update(updates)
    .eq('id', params.roundId)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}
