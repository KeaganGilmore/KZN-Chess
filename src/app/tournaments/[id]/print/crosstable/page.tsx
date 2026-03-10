import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { calculateStandings } from '@/lib/tournament/tiebreaks';
import { PrintCrosstable } from '@/components/tournaments/print/print-crosstable';
import type { TournamentPlayer, TournamentRound, TournamentPairing, TournamentSettings } from '@/lib/types';

export const revalidate = 0;

export default async function PrintCrosstablePage({
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

  let allPairings: TournamentPairing[] = [];
  if (roundIds.length > 0) {
    const { data } = await supabase.from('tournament_pairings').select('*').in('round_id', roundIds);
    allPairings = (data || []) as TournamentPairing[];
  }

  const players = (playersRes.data || []) as TournamentPlayer[];
  const settings = settingsRes.data as TournamentSettings;
  const standings = calculateStandings(players, rounds, allPairings, settings);

  // Build crosstable data
  const pairingsByRound = new Map<string, TournamentPairing[]>();
  for (const p of allPairings) {
    const list = pairingsByRound.get(p.round_id) || [];
    list.push(p);
    pairingsByRound.set(p.round_id, list);
  }

  type CtResult = { display: string; round: number };
  const crosstableData = standings.map(s => {
    const results: Record<string, CtResult> = {};

    for (const round of rounds) {
      const roundPairings = pairingsByRound.get(round.id) || [];
      for (const p of roundPairings) {
        if (p.white_player_id === s.player.id && p.black_player_id) {
          results[p.black_player_id] = { display: resultChar(p.result, 'white'), round: round.round_number };
        } else if (p.black_player_id === s.player.id) {
          results[p.white_player_id] = { display: resultChar(p.result, 'black'), round: round.round_number };
        }
      }
    }

    return {
      player: s.player,
      rank: s.rank,
      points: s.points,
      results,
    };
  });

  return (
    <PrintCrosstable
      tournamentName={tournamentRes.data.name}
      date={tournamentRes.data.date}
      venue={tournamentRes.data.venue}
      rows={crosstableData}
    />
  );
}

function resultChar(result: string | null, side: 'white' | 'black'): string {
  if (!result) return '';
  switch (result) {
    case '1-0': return side === 'white' ? '1' : '0';
    case '0-1': return side === 'black' ? '1' : '0';
    case 'draw': return '½';
    case 'white_forfeit': return side === 'white' ? '+' : '-';
    case 'black_forfeit': return side === 'black' ? '+' : '-';
    case 'double_forfeit': return '-';
    case 'bye': return '+';
    case 'half_bye': return 'H';
    default: return '';
  }
}
