/**
 * TRF-16 (Tournament Report File) Export
 * Standard format accepted by FIDE and Chess SA for rating submissions
 */

import type {
  Tournament,
  TournamentPlayer,
  TournamentRound,
  TournamentPairing,
  TournamentSettings,
  TournamentArbiter,
  PlayerStanding,
} from '@/lib/types';

interface TRFOptions {
  tournament: Tournament;
  settings: TournamentSettings;
  players: TournamentPlayer[];
  rounds: TournamentRound[];
  pairings: TournamentPairing[];
  standings: PlayerStanding[];
  arbiters: TournamentArbiter[];
  fideOnly?: boolean; // For FIDE export, only include FIDE-rated players
}

function pad(str: string, len: number): string {
  return str.padEnd(len).slice(0, len);
}

function padNum(num: number | null | undefined, len: number): string {
  const s = (num ?? '').toString();
  return s.padStart(len).slice(0, len);
}

function resultToTRF(result: string | null, side: 'white' | 'black'): string {
  if (!result) return ' ';
  switch (result) {
    case '1-0': return side === 'white' ? '1' : '0';
    case '0-1': return side === 'black' ? '1' : '0';
    case 'draw': return '=';
    case 'white_forfeit': return side === 'white' ? '+' : '-';
    case 'black_forfeit': return side === 'black' ? '+' : '-';
    case 'double_forfeit': return '-';
    case 'bye': return '+'; // full-point bye
    case 'half_bye': return 'H'; // half-point bye
    default: return ' ';
  }
}

export function generateTRF(options: TRFOptions): string {
  const { tournament, settings, players, rounds, pairings, standings, arbiters, fideOnly } = options;

  const filteredPlayers = fideOnly
    ? players.filter(p => p.fide_id && p.is_approved)
    : players.filter(p => p.is_approved);

  // Build pairings lookup: round_id -> pairing[]
  const pairingsByRound = new Map<string, TournamentPairing[]>();
  for (const p of pairings) {
    const list = pairingsByRound.get(p.round_id) || [];
    list.push(p);
    pairingsByRound.set(p.round_id, list);
  }

  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);

  // Find director and deputy
  const director = arbiters.find(a => a.role === 'director');
  const deputy = arbiters.find(a => a.role === 'arbiter');

  const lines: string[] = [];

  // Header lines
  lines.push(`012 ${tournament.name}`);
  lines.push(`022 ${tournament.venue || ''}`);
  lines.push(`032 RSA`); // South Africa
  lines.push(`042 ${formatTRFDate(tournament.date)}`);
  lines.push(`052 ${formatTRFDate(tournament.end_date || tournament.date)}`);
  lines.push(`062 ${filteredPlayers.length}`);
  lines.push(`072 ${filteredPlayers.filter(p => (p.fide_rating || 0) > 0).length}`);
  lines.push(`082 0`); // teams
  lines.push(`092 ${settings.pairing_system === 'swiss' ? 'Swiss' : 'Round Robin'}`);
  lines.push(`102 ${director?.user?.name || tournament.contact_name || ''}`);
  lines.push(`112 ${deputy?.user?.name || ''}`);
  lines.push(`122 ${tournament.time_control_detail || tournament.time_control || ''}`);

  // Player lines (001)
  const standingsByPlayerId = new Map(standings.map(s => [s.player.id, s]));

  // Assign starting rank numbers for TRF
  const sortedPlayers = [...filteredPlayers].sort((a, b) =>
    (a.starting_rank || 999) - (b.starting_rank || 999)
  );

  const playerToSRank = new Map<string, number>();
  sortedPlayers.forEach((p, i) => playerToSRank.set(p.id, i + 1));

  for (const player of sortedPlayers) {
    const sRank = playerToSRank.get(player.id)!;
    const standing = standingsByPlayerId.get(player.id);
    const points = standing ? standing.points.toFixed(1) : '0.0';

    // Build round results string
    const roundResults: string[] = [];

    for (const round of sortedRounds) {
      const roundPairings = pairingsByRound.get(round.id) || [];

      // Find this player's pairing in this round
      let found = false;
      for (const pairing of roundPairings) {
        if (pairing.white_player_id === player.id) {
          if (pairing.is_bye) {
            roundResults.push(`  0000 - ${resultToTRF(pairing.result, 'white')}`);
          } else if (pairing.black_player_id) {
            const oppRank = playerToSRank.get(pairing.black_player_id) || 0;
            roundResults.push(`  ${padNum(oppRank, 4)} w ${resultToTRF(pairing.result, 'white')}`);
          }
          found = true;
          break;
        }
        if (pairing.black_player_id === player.id) {
          const oppRank = playerToSRank.get(pairing.white_player_id) || 0;
          roundResults.push(`  ${padNum(oppRank, 4)} b ${resultToTRF(pairing.result, 'black')}`);
          found = true;
          break;
        }
      }

      if (!found) {
        roundResults.push(`  0000 - Z`); // not paired (zero-point bye)
      }
    }

    const sex = player.sex || '';
    const title = ''; // No title info stored currently
    const name = pad(player.player_name, 33);
    const fideRating = padNum(player.fide_rating, 4);
    const fed = 'RSA';
    const fideId = pad(player.fide_id || '', 11);
    const birthDate = '          '; // No birth date stored

    const line = `001 ${padNum(sRank, 4)} ${pad(sex, 1)} ${pad(title, 3)} ${name} ${fideRating} ${pad(fed, 3)} ${fideId} ${birthDate} ${pad(points, 4)}  ${roundResults.join('')}`;
    lines.push(line);
  }

  return lines.join('\n');
}

function formatTRFDate(dateStr: string): string {
  try {
    const d = new Date(dateStr);
    const dd = d.getDate().toString().padStart(2, '0');
    const mm = (d.getMonth() + 1).toString().padStart(2, '0');
    const yyyy = d.getFullYear();
    return `${dd}/${mm}/${yyyy}`;
  } catch {
    return dateStr;
  }
}

/**
 * Generate CSV export as fallback
 */
export function generateCSVExport(options: TRFOptions): string {
  const { players, rounds, pairings, standings } = options;

  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);
  const pairingsByRound = new Map<string, TournamentPairing[]>();
  for (const p of pairings) {
    const list = pairingsByRound.get(p.round_id) || [];
    list.push(p);
    pairingsByRound.set(p.round_id, list);
  }

  const standingsByPlayerId = new Map(standings.map(s => [s.player.id, s]));

  // Header
  const roundHeaders = sortedRounds.map(r => `R${r.round_number}_Opponent,R${r.round_number}_Color,R${r.round_number}_Result`);
  const header = [
    'Rank', 'Starting#', 'Name', 'FIDE_ID', 'ChessSA_ID',
    'FIDE_Rating', 'National_Rating', 'Club', 'District',
    'Sex', 'Category', 'Points', ...roundHeaders,
  ].join(',');

  const rows: string[] = [header];

  const sortedPlayers = [...players]
    .filter(p => p.is_approved)
    .sort((a, b) => {
      const sA = standingsByPlayerId.get(a.id);
      const sB = standingsByPlayerId.get(b.id);
      return (sA?.rank || 999) - (sB?.rank || 999);
    });

  for (const player of sortedPlayers) {
    const standing = standingsByPlayerId.get(player.id);
    const roundData: string[] = [];

    for (const round of sortedRounds) {
      const roundPairings = pairingsByRound.get(round.id) || [];
      let found = false;

      for (const pairing of roundPairings) {
        if (pairing.white_player_id === player.id) {
          const opp = pairing.is_bye ? '' : (pairing.black_player_id || '');
          const oppPlayer = opp ? players.find(p => p.id === opp) : null;
          roundData.push(csvEscape(oppPlayer?.player_name || (pairing.is_bye ? 'BYE' : '')));
          roundData.push(pairing.is_bye ? '' : 'W');
          roundData.push(pairing.result || '');
          found = true;
          break;
        }
        if (pairing.black_player_id === player.id) {
          const oppPlayer = players.find(p => p.id === pairing.white_player_id);
          roundData.push(csvEscape(oppPlayer?.player_name || ''));
          roundData.push('B');
          roundData.push(pairing.result || '');
          found = true;
          break;
        }
      }

      if (!found) {
        roundData.push('', '', '');
      }
    }

    rows.push([
      standing?.rank || '',
      player.starting_rank || '',
      csvEscape(player.player_name),
      player.fide_id || '',
      player.chess_sa_id || '',
      player.fide_rating || '',
      player.national_rating || '',
      csvEscape(player.club || ''),
      csvEscape(player.district || ''),
      player.sex || '',
      player.age_category || '',
      standing?.points || 0,
      ...roundData,
    ].join(','));
  }

  return rows.join('\n');
}

function csvEscape(str: string): string {
  if (str.includes(',') || str.includes('"') || str.includes('\n')) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}
