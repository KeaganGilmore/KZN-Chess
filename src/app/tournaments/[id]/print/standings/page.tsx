import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { calculateStandings } from '@/lib/tournament/tiebreaks';
import { PrintStandings } from '@/components/tournaments/print/print-standings';
import type { TournamentPlayer, TournamentRound, TournamentPairing, TournamentSettings } from '@/lib/types';

export const revalidate = 0;

export default async function PrintStandingsPage({
  params,
}: {
  params: { id: string };
}) {
  const supabase = createServerClient();

  const [tournamentRes, settingsRes, playersRes, roundsRes] = await Promise.all([
    supabase.from('tournaments').select('name, date, venue').eq('id', params.id).single(),
    supabase.from('tournament_settings').select('*').eq('tournament_id', params.id).single(),
    supabase.from('tournament_players').select('*').eq('tournament_id', params.id).eq('is_approved', true),
    supabase.from('tournament_rounds').select('*').eq('tournament_id', params.id).order('round_number'),
  ]);

  if (!tournamentRes.data || !settingsRes.data) notFound();

  const rounds = (roundsRes.data || []) as TournamentRound[];
  const roundIds = rounds.map(r => r.id);

  let pairings: TournamentPairing[] = [];
  if (roundIds.length > 0) {
    const { data } = await supabase.from('tournament_pairings').select('*').in('round_id', roundIds);
    pairings = (data || []) as TournamentPairing[];
  }

  const standings = calculateStandings(
    (playersRes.data || []) as TournamentPlayer[],
    rounds, pairings,
    settingsRes.data as TournamentSettings
  );

  return (
    <PrintStandings
      tournamentName={tournamentRes.data.name}
      date={tournamentRes.data.date}
      venue={tournamentRes.data.venue}
      standings={standings}
      tiebreakOrder={settingsRes.data.tiebreak_order}
      roundsPlayed={rounds.length}
    />
  );
}
