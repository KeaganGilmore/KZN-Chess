/**
 * WhatsApp sharing text generators for pairings and standings
 */

import type {
  TournamentPairing,
  PlayerStanding,
} from '@/lib/types';

export function generatePairingsWhatsApp(
  tournamentName: string,
  roundNumber: number,
  pairings: TournamentPairing[],
  players: Map<string, { player_name: string; fide_rating?: number | null; national_rating?: number | null }>,
  tournamentUrl: string
): string {
  const lines: string[] = [`🏆 ${tournamentName} R${roundNumber} Pairings`];

  const sorted = [...pairings].sort((a, b) => a.board_number - b.board_number);

  for (const p of sorted) {
    const white = players.get(p.white_player_id);
    if (p.is_bye) {
      lines.push(`Bd${p.board_number}: ${white?.player_name || '?'} - BYE`);
      continue;
    }
    const black = p.black_player_id ? players.get(p.black_player_id) : null;
    const wRating = white?.fide_rating || white?.national_rating;
    const bRating = black?.fide_rating || black?.national_rating;
    const wStr = `${white?.player_name || '?'}${wRating ? ` (${wRating})` : ''}`;
    const bStr = `${black?.player_name || '?'}${bRating ? ` (${bRating})` : ''}`;
    lines.push(`Bd${p.board_number}: ${wStr} ⬜ vs ${bStr} ⬛`);
  }

  lines.push('');
  lines.push(`Full details: ${tournamentUrl}`);

  return lines.join('\n');
}

export function generateStandingsWhatsApp(
  tournamentName: string,
  roundNumber: number,
  standings: PlayerStanding[],
  totalRounds: number,
  tournamentUrl: string,
  maxPlayers: number = 20
): string {
  const lines: string[] = [`🏆 ${tournamentName} Standings after R${roundNumber}`];

  const top = standings.slice(0, maxPlayers);

  for (const s of top) {
    lines.push(`${s.rank}. ${s.player.player_name} - ${s.points}/${roundNumber}`);
  }

  if (standings.length > maxPlayers) {
    lines.push(`... and ${standings.length - maxPlayers} more`);
  }

  lines.push('');
  lines.push(`Full standings: ${tournamentUrl}`);

  return lines.join('\n');
}

export function getWhatsAppShareUrl(text: string): string {
  return `https://wa.me/?text=${encodeURIComponent(text)}`;
}
