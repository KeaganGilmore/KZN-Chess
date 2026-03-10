import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { requireTournamentManager } from '@/lib/tournament/access';

export async function GET(
  _request: Request,
  { params }: { params: { id: string; roundId: string } }
) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('tournament_pairings')
    .select('*, white_player:tournament_players!tournament_pairings_white_player_id_fkey(*), black_player:tournament_players!tournament_pairings_black_player_id_fkey(*)')
    .eq('round_id', params.roundId)
    .order('board_number', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

// Update a pairing (result entry or manual edit)
export async function PATCH(
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
  const { pairing_id, ...updates } = body;

  if (!pairing_id) return NextResponse.json({ error: 'pairing_id required' }, { status: 400 });

  const supabase = createServerClient();

  // Set is_forfeit flag based on result
  if (updates.result) {
    updates.is_forfeit = ['white_forfeit', 'black_forfeit', 'double_forfeit'].includes(updates.result);
  }

  const { data, error } = await supabase
    .from('tournament_pairings')
    .update(updates)
    .eq('id', pairing_id)
    .eq('round_id', params.roundId)
    .select('*, white_player:tournament_players!tournament_pairings_white_player_id_fkey(*), black_player:tournament_players!tournament_pairings_black_player_id_fkey(*)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

// Bulk update results
export async function PUT(
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
  const { results } = body as { results: { pairing_id: string; result: string }[] };

  if (!results || !Array.isArray(results)) {
    return NextResponse.json({ error: 'results array required' }, { status: 400 });
  }

  const supabase = createServerClient();
  const updated: unknown[] = [];

  for (const r of results) {
    const is_forfeit = ['white_forfeit', 'black_forfeit', 'double_forfeit'].includes(r.result);
    const { data, error } = await supabase
      .from('tournament_pairings')
      .update({ result: r.result, is_forfeit })
      .eq('id', r.pairing_id)
      .eq('round_id', params.roundId)
      .select()
      .single();

    if (!error && data) updated.push(data);
  }

  return NextResponse.json({ updated: updated.length });
}

// Delete all pairings for a round (reset)
export async function DELETE(
  _request: Request,
  { params }: { params: { id: string; roundId: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requireTournamentManager(params.id, user.id, user.role);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createServerClient();

  // Reset round status
  await supabase
    .from('tournament_rounds')
    .update({ status: 'not_started', published_at: null })
    .eq('id', params.roundId);

  const { error } = await supabase
    .from('tournament_pairings')
    .delete()
    .eq('round_id', params.roundId);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
