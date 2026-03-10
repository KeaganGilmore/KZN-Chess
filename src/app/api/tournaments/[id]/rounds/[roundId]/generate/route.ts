import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { requireTournamentManager } from '@/lib/tournament/access';
import {
  buildPlayerStates,
  generateFirstRoundPairings,
  generateSwissPairings,
} from '@/lib/tournament/swiss-pairing';
import { generateRoundRobinSchedule } from '@/lib/tournament/round-robin';
import type { TournamentPairing, TournamentPlayer, TournamentSettings } from '@/lib/types';

export async function POST(
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

  // Get round info
  const { data: round } = await supabase
    .from('tournament_rounds')
    .select('*')
    .eq('id', params.roundId)
    .eq('tournament_id', params.id)
    .single();

  if (!round) return NextResponse.json({ error: 'Round not found' }, { status: 404 });

  if (round.status !== 'not_started') {
    return NextResponse.json({ error: 'Pairings already generated for this round' }, { status: 400 });
  }

  // Get settings
  const { data: settings } = await supabase
    .from('tournament_settings')
    .select('*')
    .eq('tournament_id', params.id)
    .single();

  if (!settings) return NextResponse.json({ error: 'Tournament settings not found' }, { status: 404 });

  // Get players
  const { data: players } = await supabase
    .from('tournament_players')
    .select('*')
    .eq('tournament_id', params.id)
    .eq('is_approved', true)
    .order('starting_rank', { ascending: true });

  if (!players || players.length < 2) {
    return NextResponse.json({ error: 'Need at least 2 approved players' }, { status: 400 });
  }

  // Handle withdrawn players: add zero-point byes for this round
  const activePlayers = players.filter(p => {
    if (!p.is_withdrawn) return true;
    // Withdrawn after a later round still plays this one
    if (p.withdrawn_after_round && p.withdrawn_after_round >= round.round_number) return true;
    return false;
  });

  // Handle players with requested byes for this round
  const byeRequestPlayers = activePlayers.filter(p => {
    const requested = p.bye_requested_rounds || [];
    return requested.includes(round.round_number);
  });

  const playersForPairing = activePlayers.filter(p => {
    const requested = p.bye_requested_rounds || [];
    return !requested.includes(round.round_number);
  });

  let pairingResults: { board_number: number; white_player_id: string; black_player_id: string | null; is_bye: boolean }[];

  if (settings.pairing_system === 'swiss') {
    if (round.round_number === 1) {
      pairingResults = generateFirstRoundPairings(playersForPairing as TournamentPlayer[], settings as TournamentSettings);
    } else {
      // Get all previous pairings
      const { data: prevRounds } = await supabase
        .from('tournament_rounds')
        .select('id')
        .eq('tournament_id', params.id)
        .lt('round_number', round.round_number);

      const prevRoundIds = prevRounds?.map(r => r.id) || [];

      let allPrevPairings: TournamentPairing[] = [];
      if (prevRoundIds.length > 0) {
        const { data: prevPairings } = await supabase
          .from('tournament_pairings')
          .select('*')
          .in('round_id', prevRoundIds);
        allPrevPairings = (prevPairings || []) as TournamentPairing[];
      }

      const states = buildPlayerStates(
        playersForPairing as TournamentPlayer[],
        allPrevPairings,
        round.round_number,
        settings as TournamentSettings
      );
      pairingResults = generateSwissPairings(states, round.round_number);
    }
  } else {
    // Round Robin / Double Round Robin
    const isDouble = settings.pairing_system === 'double_round_robin';
    const allRR = generateRoundRobinSchedule(playersForPairing as TournamentPlayer[], settings as TournamentSettings, isDouble);
    // Filter for this round only
    pairingResults = allRR
      .filter(p => p.round_number === round.round_number)
      .map(p => ({
        board_number: p.board_number,
        white_player_id: p.white_player_id,
        black_player_id: p.black_player_id,
        is_bye: p.is_bye,
      }));
  }

  // Add half-point byes for players who requested them
  let boardNum = pairingResults.length;
  for (const player of byeRequestPlayers) {
    boardNum++;
    pairingResults.push({
      board_number: boardNum,
      white_player_id: player.id,
      black_player_id: null,
      is_bye: true,
    });
  }

  // Insert pairings
  const pairingsToInsert = pairingResults.map(p => ({
    round_id: params.roundId,
    board_number: p.board_number,
    white_player_id: p.white_player_id,
    black_player_id: p.black_player_id,
    is_bye: p.is_bye,
    result: p.is_bye
      ? (byeRequestPlayers.some(bp => bp.id === p.white_player_id) ? 'half_bye' : 'bye')
      : null,
  }));

  const { data: insertedPairings, error } = await supabase
    .from('tournament_pairings')
    .insert(pairingsToInsert)
    .select('*, white_player:tournament_players!tournament_pairings_white_player_id_fkey(*), black_player:tournament_players!tournament_pairings_black_player_id_fkey(*)');

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });

  // Update round status
  await supabase
    .from('tournament_rounds')
    .update({ status: 'not_started' }) // stays not_started until published
    .eq('id', params.roundId);

  return NextResponse.json({
    pairings: insertedPairings,
    round: round,
  }, { status: 201 });
}
