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
    .from('tournament_rounds')
    .select('*')
    .eq('tournament_id', params.id)
    .order('round_number', { ascending: true });

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

  const supabase = createServerClient();

  // Get current max round number
  const { data: existing } = await supabase
    .from('tournament_rounds')
    .select('round_number')
    .eq('tournament_id', params.id)
    .order('round_number', { ascending: false })
    .limit(1);

  const nextRound = (existing?.[0]?.round_number || 0) + 1;

  // Check if we haven't exceeded num_rounds
  const { data: settings } = await supabase
    .from('tournament_settings')
    .select('num_rounds')
    .eq('tournament_id', params.id)
    .single();

  if (settings && nextRound > settings.num_rounds) {
    return NextResponse.json({ error: 'All rounds have been created' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tournament_rounds')
    .insert({
      tournament_id: params.id,
      round_number: nextRound,
      status: 'not_started',
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}
