import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { calculateStandings } from '@/lib/tournament/tiebreaks';
import type { TournamentPlayer, TournamentRound, TournamentPairing, TournamentSettings } from '@/lib/types';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();

  const [settingsRes, playersRes, roundsRes] = await Promise.all([
    supabase.from('tournament_settings').select('*').eq('tournament_id', params.id).single(),
    supabase.from('tournament_players').select('*').eq('tournament_id', params.id).eq('is_approved', true),
    supabase.from('tournament_rounds').select('*').eq('tournament_id', params.id).order('round_number'),
  ]);

  if (!settingsRes.data || !playersRes.data) {
    return NextResponse.json({ error: 'Tournament data not found' }, { status: 404 });
  }

  const rounds = (roundsRes.data || []) as TournamentRound[];
  const roundIds = rounds.map(r => r.id);

  let pairings: TournamentPairing[] = [];
  if (roundIds.length > 0) {
    const { data } = await supabase
      .from('tournament_pairings')
      .select('*')
      .in('round_id', roundIds);
    pairings = (data || []) as TournamentPairing[];
  }

  const standings = calculateStandings(
    playersRes.data as TournamentPlayer[],
    rounds,
    pairings,
    settingsRes.data as TournamentSettings
  );

  return NextResponse.json({
    standings,
    rounds: rounds.length,
    settings: settingsRes.data,
  });
}
