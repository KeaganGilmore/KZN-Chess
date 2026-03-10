import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { requireTournamentManager } from '@/lib/tournament/access';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('tournament_players')
    .select('*, section:tournament_sections(*)')
    .eq('tournament_id', params.id)
    .order('starting_rank', { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requireTournamentManager(params.id, user.id, user.role);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const supabase = createServerClient();

  // Get current max starting rank
  const { data: existing } = await supabase
    .from('tournament_players')
    .select('starting_rank')
    .eq('tournament_id', params.id)
    .order('starting_rank', { ascending: false })
    .limit(1);

  const nextRank = (existing?.[0]?.starting_rank || 0) + 1;

  const playerData = {
    tournament_id: params.id,
    player_name: body.player_name,
    fide_id: body.fide_id || null,
    chess_sa_id: body.chess_sa_id || null,
    fide_rating: body.fide_rating || null,
    national_rating: body.national_rating || null,
    club: body.club || null,
    district: body.district || null,
    sex: body.sex || null,
    age_category: body.age_category || 'open',
    section_id: body.section_id || null,
    starting_rank: body.starting_rank || nextRank,
    is_approved: true,
  };

  const { data, error } = await supabase
    .from('tournament_players')
    .insert(playerData)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function PATCH(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requireTournamentManager(params.id, user.id, user.role);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const { player_id, ...updates } = body;

  if (!player_id) return NextResponse.json({ error: 'player_id required' }, { status: 400 });

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('tournament_players')
    .update(updates)
    .eq('id', player_id)
    .eq('tournament_id', params.id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data);
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await requireTournamentManager(params.id, user.id, user.role);
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const playerId = searchParams.get('player_id');
  if (!playerId) return NextResponse.json({ error: 'player_id required' }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase
    .from('tournament_players')
    .delete()
    .eq('id', playerId)
    .eq('tournament_id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
