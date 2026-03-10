import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { PrintPairings } from '@/components/tournaments/print/print-pairings';

export const revalidate = 0;

export default async function PrintPairingsPage({
  params,
  searchParams,
}: {
  params: { id: string };
  searchParams: { round?: string };
}) {
  const supabase = createServerClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('name, date, venue')
    .eq('id', params.id)
    .single();

  if (!tournament) notFound();

  const roundNum = parseInt(searchParams.round || '1');

  const { data: round } = await supabase
    .from('tournament_rounds')
    .select('id, round_number')
    .eq('tournament_id', params.id)
    .eq('round_number', roundNum)
    .single();

  if (!round) notFound();

  const { data: pairings } = await supabase
    .from('tournament_pairings')
    .select('*, white_player:tournament_players!tournament_pairings_white_player_id_fkey(*), black_player:tournament_players!tournament_pairings_black_player_id_fkey(*)')
    .eq('round_id', round.id)
    .order('board_number', { ascending: true });

  return (
    <PrintPairings
      tournamentName={tournament.name}
      date={tournament.date}
      venue={tournament.venue}
      roundNumber={round.round_number}
      pairings={pairings || []}
    />
  );
}
