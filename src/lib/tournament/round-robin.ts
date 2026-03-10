/**
 * Round Robin Pairing using Berger Tables (Circle Method)
 *
 * For N players (or N+1 if odd, with a bye player):
 * - Fix player N in position, rotate the rest
 * - Each round produces N/2 pairings
 * - Double Round Robin: run the same schedule twice, swapping colors
 */

import type { TournamentPlayer, TournamentSettings } from '@/lib/types';

interface RRPairingResult {
  round_number: number;
  board_number: number;
  white_player_id: string;
  black_player_id: string | null;
  is_bye: boolean;
}

function getRating(player: TournamentPlayer, ratingType: string): number {
  if (ratingType === 'fide') return player.fide_rating || 0;
  if (ratingType === 'national') return player.national_rating || 0;
  return player.fide_rating || player.national_rating || 0;
}

export function generateRoundRobinSchedule(
  players: TournamentPlayer[],
  settings: TournamentSettings,
  isDouble: boolean = false
): RRPairingResult[] {
  const sorted = [...players]
    .filter(p => !p.is_withdrawn && p.is_approved)
    .sort((a, b) => {
      const rA = getRating(a, settings.rating_type);
      const rB = getRating(b, settings.rating_type);
      return rB - rA || (a.starting_rank || 0) - (b.starting_rank || 0);
    });

  const n = sorted.length;
  const hasBye = n % 2 !== 0;
  const playerIds = sorted.map(p => p.id);

  // Add a virtual "bye" player if odd number
  if (hasBye) {
    playerIds.push('BYE');
  }

  const total = playerIds.length;
  const numRounds = total - 1;
  const allPairings: RRPairingResult[] = [];

  // Berger table generation using circle method
  // Fix last player, rotate others
  const fixed = playerIds[total - 1];
  const rotating = playerIds.slice(0, total - 1);

  for (let round = 0; round < numRounds; round++) {
    const roundPairings: RRPairingResult[] = [];
    let boardNum = 1;

    // First pairing: fixed vs rotating[0]
    const p1 = fixed;
    const p2 = rotating[0];
    // Alternate home/away for fixed player each round
    const fixedIsWhite = round % 2 === 0;

    if (p1 === 'BYE' || p2 === 'BYE') {
      const realPlayer = p1 === 'BYE' ? p2 : p1;
      roundPairings.push({
        round_number: round + 1,
        board_number: boardNum++,
        white_player_id: realPlayer,
        black_player_id: null,
        is_bye: true,
      });
    } else {
      roundPairings.push({
        round_number: round + 1,
        board_number: boardNum++,
        white_player_id: fixedIsWhite ? p1 : p2,
        black_player_id: fixedIsWhite ? p2 : p1,
        is_bye: false,
      });
    }

    // Remaining pairings: rotating[i] vs rotating[n-2-i]
    for (let i = 1; i < total / 2; i++) {
      const a = rotating[i];
      const b = rotating[total - 2 - i];

      if (a === 'BYE' || b === 'BYE') {
        const realPlayer = a === 'BYE' ? b : a;
        roundPairings.push({
          round_number: round + 1,
          board_number: boardNum++,
          white_player_id: realPlayer,
          black_player_id: null,
          is_bye: true,
        });
      } else {
        // Alternate colors based on round
        const aIsWhite = (round + i) % 2 === 0;
        roundPairings.push({
          round_number: round + 1,
          board_number: boardNum++,
          white_player_id: aIsWhite ? a : b,
          black_player_id: aIsWhite ? b : a,
          is_bye: false,
        });
      }
    }

    allPairings.push(...roundPairings);

    // Rotate: shift rotating array
    rotating.unshift(rotating.pop()!);
  }

  // For double round robin, duplicate all rounds with colors swapped
  if (isDouble) {
    const secondHalf = allPairings.map(p => ({
      ...p,
      round_number: p.round_number + numRounds,
      white_player_id: p.is_bye ? p.white_player_id : p.black_player_id!,
      black_player_id: p.is_bye ? null : p.white_player_id,
    }));
    allPairings.push(...secondHalf);
  }

  return allPairings;
}
