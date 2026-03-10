import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { requireTournamentManager } from '@/lib/tournament/access';
import { calculateStandings } from '@/lib/tournament/tiebreaks';
import { generateTRF, generateCSVExport } from '@/lib/tournament/trf-export';
import type {
  Tournament,
  TournamentPlayer,
  TournamentRound,
  TournamentPairing,
  TournamentSettings,
  TournamentArbiter,
} from '@/lib/types';

export async function GET(
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
  const format = searchParams.get('format') || 'trf';
  const fideOnly = searchParams.get('fide_only') === 'true';

  const supabase = createServerClient();

  const [tournamentRes, settingsRes, playersRes, roundsRes, arbitersRes] = await Promise.all([
    supabase.from('tournaments').select('*').eq('id', params.id).single(),
    supabase.from('tournament_settings').select('*').eq('tournament_id', params.id).single(),
    supabase.from('tournament_players').select('*').eq('tournament_id', params.id).eq('is_approved', true),
    supabase.from('tournament_rounds').select('*').eq('tournament_id', params.id).order('round_number'),
    supabase.from('tournament_arbiters').select('*, user:users(id, name, email)').eq('tournament_id', params.id),
  ]);

  if (!tournamentRes.data || !settingsRes.data) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
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

  const players = (playersRes.data || []) as TournamentPlayer[];
  const settings = settingsRes.data as TournamentSettings;

  const standings = calculateStandings(players, rounds, pairings, settings);

  const options = {
    tournament: tournamentRes.data as Tournament,
    settings,
    players,
    rounds,
    pairings,
    standings,
    arbiters: (arbitersRes.data || []) as TournamentArbiter[],
    fideOnly,
  };

  if (format === 'csv') {
    const csv = generateCSVExport(options);
    return new NextResponse(csv, {
      headers: {
        'Content-Type': 'text/csv',
        'Content-Disposition': `attachment; filename="${options.tournament.name.replace(/[^a-z0-9]/gi, '_')}_export.csv"`,
      },
    });
  }

  const trf = generateTRF(options);
  return new NextResponse(trf, {
    headers: {
      'Content-Type': 'text/plain',
      'Content-Disposition': `attachment; filename="${options.tournament.name.replace(/[^a-z0-9]/gi, '_')}.trf"`,
    },
  });
}
