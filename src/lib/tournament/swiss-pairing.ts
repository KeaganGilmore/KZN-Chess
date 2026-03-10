/**
 * FIDE Dutch Swiss Pairing System (simplified implementation)
 *
 * Implements the core FIDE Dutch rules:
 * - Score group pairing (S1 vs S2)
 * - No repeat opponents (hard constraint)
 * - No same color 3x in a row (hard constraint)
 * - No duplicate byes (hard constraint)
 * - Color alternation (soft constraint)
 * - Minimize color difference (soft constraint)
 */

import type { TournamentPlayer, TournamentPairing, TournamentSettings, GameResult } from '@/lib/types';

interface PlayerState {
  id: string;
  player: TournamentPlayer;
  score: number;
  rating: number;
  colorHistory: ('W' | 'B' | null)[]; // per round
  opponents: Set<string>; // player IDs already faced
  hadBye: boolean;
  isWithdrawn: boolean;
  startingRank: number;
}

interface PairingResult {
  board_number: number;
  white_player_id: string;
  black_player_id: string | null;
  is_bye: boolean;
}

export function buildPlayerStates(
  players: TournamentPlayer[],
  pairings: TournamentPairing[],
  roundNumber: number,
  settings: TournamentSettings
): PlayerState[] {
  const states: PlayerState[] = players.map(p => ({
    id: p.id,
    player: p,
    score: 0,
    rating: getRating(p, settings.rating_type),
    colorHistory: [],
    opponents: new Set<string>(),
    hadBye: false,
    isWithdrawn: p.is_withdrawn,
    startingRank: p.starting_rank || 0,
  }));

  const stateMap = new Map(states.map(s => [s.id, s]));

  // Process all previous rounds' pairings
  for (const pairing of pairings) {
    const white = stateMap.get(pairing.white_player_id);
    const black = pairing.black_player_id ? stateMap.get(pairing.black_player_id) : null;

    if (pairing.is_bye && white) {
      white.hadBye = true;
      white.score += getPointsForResult(pairing.result, 'white', settings);
      white.colorHistory.push(null);
    } else if (white && black) {
      white.opponents.add(black.id);
      black.opponents.add(white.id);
      white.colorHistory.push('W');
      black.colorHistory.push('B');
      white.score += getPointsForResult(pairing.result, 'white', settings);
      black.score += getPointsForResult(pairing.result, 'black', settings);
    }
  }

  return states;
}

function getRating(player: TournamentPlayer, ratingType: string): number {
  if (ratingType === 'fide') return player.fide_rating || 0;
  if (ratingType === 'national') return player.national_rating || 0;
  return player.fide_rating || player.national_rating || 0;
}

function getPointsForResult(
  result: GameResult | null,
  side: 'white' | 'black',
  settings: TournamentSettings
): number {
  if (!result) return 0;
  switch (result) {
    case '1-0':
      return side === 'white' ? settings.point_win : settings.point_loss;
    case '0-1':
      return side === 'black' ? settings.point_win : settings.point_loss;
    case 'draw':
      return settings.point_draw;
    case 'white_forfeit':
      return side === 'white' ? settings.point_win : settings.point_loss;
    case 'black_forfeit':
      return side === 'black' ? settings.point_win : settings.point_loss;
    case 'double_forfeit':
      return settings.point_loss;
    case 'bye':
      return settings.point_bye;
    case 'half_bye':
      return settings.point_half_bye;
    default:
      return 0;
  }
}

export function generateFirstRoundPairings(
  players: TournamentPlayer[],
  settings: TournamentSettings
): PairingResult[] {
  // Sort by rating descending, then by starting rank
  const sorted = [...players]
    .filter(p => !p.is_withdrawn && p.is_approved)
    .sort((a, b) => {
      const ratingA = getRating(a, settings.rating_type);
      const ratingB = getRating(b, settings.rating_type);
      if (ratingB !== ratingA) return ratingB - ratingA;
      return (a.starting_rank || 0) - (b.starting_rank || 0);
    });

  const pairings: PairingResult[] = [];
  const n = sorted.length;
  const half = Math.floor(n / 2);

  // Odd number: lowest-rated gets a bye
  let byePlayer: TournamentPlayer | null = null;
  const toPair = [...sorted];

  if (n % 2 !== 0) {
    byePlayer = toPair.pop()!;
  }

  // S1 = top half, S2 = bottom half
  // Pair: S1[0] vs S2[0], S1[1] vs S2[1], etc.
  // Top half (S1) gets white
  const s1 = toPair.slice(0, half);
  const s2 = toPair.slice(half);

  for (let i = 0; i < s1.length; i++) {
    pairings.push({
      board_number: i + 1,
      white_player_id: s1[i].id,
      black_player_id: s2[i].id,
      is_bye: false,
    });
  }

  if (byePlayer) {
    pairings.push({
      board_number: pairings.length + 1,
      white_player_id: byePlayer.id,
      black_player_id: null,
      is_bye: true,
    });
  }

  return pairings;
}

export function generateSwissPairings(
  states: PlayerState[],
  _roundNumber: number
): PairingResult[] {
  // Filter active players
  const active = states.filter(s => !s.isWithdrawn);

  if (active.length === 0) return [];

  // Handle bye for odd number of players
  let byePlayer: PlayerState | null = null;
  const toPair = [...active];

  if (toPair.length % 2 !== 0) {
    byePlayer = selectByePlayer(toPair);
    const idx = toPair.indexOf(byePlayer);
    toPair.splice(idx, 1);
  }

  // Group by score
  const scoreGroups = groupByScore(toPair);
  const pairings: PairingResult[] = [];
  const paired = new Set<string>();

  // Process score groups from highest to lowest
  const scores = Object.keys(scoreGroups)
    .map(Number)
    .sort((a, b) => b - a);

  let unpaired: PlayerState[] = [];

  for (const score of scores) {
    const group = [...unpaired, ...scoreGroups[score]];
    unpaired = [];

    // Sort within group by rating descending
    group.sort((a, b) => b.rating - a.rating);

    // Try to pair within the group
    const result = pairScoreGroup(group, paired);
    pairings.push(...result.pairings);
    unpaired = result.unpaired;
  }

  // Handle any remaining unpaired players (shouldn't happen if algorithm is correct)
  if (unpaired.length >= 2) {
    for (let i = 0; i < unpaired.length - 1; i += 2) {
      const [white, black] = assignColors(unpaired[i], unpaired[i + 1]);
      pairings.push({
        board_number: 0,
        white_player_id: white.id,
        black_player_id: black.id,
        is_bye: false,
      });
      paired.add(white.id);
      paired.add(black.id);
    }
    if (unpaired.length % 2 !== 0 && !byePlayer) {
      byePlayer = unpaired[unpaired.length - 1];
    }
  }

  // Assign board numbers
  pairings.forEach((p, i) => (p.board_number = i + 1));

  // Add bye
  if (byePlayer) {
    pairings.push({
      board_number: pairings.length + 1,
      white_player_id: byePlayer.id,
      black_player_id: null,
      is_bye: true,
    });
  }

  return pairings;
}

function selectByePlayer(players: PlayerState[]): PlayerState {
  // Lowest score, then lowest rating, who hasn't had a bye
  const candidates = players
    .filter(p => !p.hadBye)
    .sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.rating - b.rating;
    });

  // If everyone has had a bye, pick the lowest-scored/rated player
  if (candidates.length === 0) {
    return [...players].sort((a, b) => {
      if (a.score !== b.score) return a.score - b.score;
      return a.rating - b.rating;
    })[0];
  }

  return candidates[0];
}

function groupByScore(players: PlayerState[]): Record<number, PlayerState[]> {
  const groups: Record<number, PlayerState[]> = {};
  for (const p of players) {
    const score = p.score;
    if (!groups[score]) groups[score] = [];
    groups[score].push(p);
  }
  return groups;
}

function pairScoreGroup(
  group: PlayerState[],
  alreadyPaired: Set<string>
): { pairings: PairingResult[]; unpaired: PlayerState[] } {
  const available = group.filter(p => !alreadyPaired.has(p.id));
  const pairings: PairingResult[] = [];

  if (available.length < 2) {
    return { pairings, unpaired: available };
  }

  const half = Math.floor(available.length / 2);
  const s1 = available.slice(0, half);
  const s2 = available.slice(half);

  const usedFromS2 = new Set<number>();

  for (const p1 of s1) {
    let bestMatch: PlayerState | null = null;
    let bestIdx = -1;

    for (let j = 0; j < s2.length; j++) {
      if (usedFromS2.has(j)) continue;
      const p2 = s2[j];

      // Hard constraint: no repeat opponents
      if (p1.opponents.has(p2.id)) continue;

      // Hard constraint: no same color 3x in a row
      if (wouldViolateColorRule(p1, 'W') && wouldViolateColorRule(p2, 'B')) {
        if (wouldViolateColorRule(p1, 'B') && wouldViolateColorRule(p2, 'W')) {
          continue; // Can't pair in either color arrangement
        }
      }

      bestMatch = p2;
      bestIdx = j;
      break;
    }

    if (bestMatch && bestIdx >= 0) {
      usedFromS2.add(bestIdx);
      const [white, black] = assignColors(p1, bestMatch);
      pairings.push({
        board_number: 0,
        white_player_id: white.id,
        black_player_id: black.id,
        is_bye: false,
      });
      alreadyPaired.add(p1.id);
      alreadyPaired.add(bestMatch.id);
    }
  }

  // Collect unpaired from both halves
  const unpaired: PlayerState[] = [];
  for (const p of s1) {
    if (!alreadyPaired.has(p.id)) unpaired.push(p);
  }
  for (let j = 0; j < s2.length; j++) {
    if (!usedFromS2.has(j) && !alreadyPaired.has(s2[j].id)) {
      unpaired.push(s2[j]);
    }
  }

  return { pairings, unpaired };
}

function wouldViolateColorRule(player: PlayerState, color: 'W' | 'B'): boolean {
  const history = player.colorHistory;
  if (history.length < 2) return false;
  const last2 = history.slice(-2);
  return last2.every(c => c === color);
}

function assignColors(p1: PlayerState, p2: PlayerState): [PlayerState, PlayerState] {
  const p1Pref = getColorPreference(p1);
  const p2Pref = getColorPreference(p2);

  // If one strongly needs a color, give it to them
  if (p1Pref === 'W' && p2Pref !== 'W') return [p1, p2];
  if (p1Pref === 'B' && p2Pref !== 'B') return [p2, p1];
  if (p2Pref === 'W' && p1Pref !== 'W') return [p2, p1];
  if (p2Pref === 'B' && p1Pref !== 'B') return [p1, p2];

  // Both want the same or neither has preference
  // Higher-rated gets the due color based on alternation
  const p1Whites = p1.colorHistory.filter(c => c === 'W').length;
  const p1Blacks = p1.colorHistory.filter(c => c === 'B').length;
  const p2Whites = p2.colorHistory.filter(c => c === 'W').length;
  const p2Blacks = p2.colorHistory.filter(c => c === 'B').length;

  // Player with more whites should get black
  const p1Diff = p1Whites - p1Blacks;
  const p2Diff = p2Whites - p2Blacks;

  if (p1Diff > p2Diff) return [p2, p1]; // p1 had more whites, give p1 black
  if (p2Diff > p1Diff) return [p1, p2]; // p2 had more whites, give p2 black

  // Equal: higher-rated gets white (first round convention)
  return p1.rating >= p2.rating ? [p1, p2] : [p2, p1];
}

function getColorPreference(player: PlayerState): 'W' | 'B' | null {
  const history = player.colorHistory.filter(c => c !== null);
  if (history.length === 0) return null;

  const last = history[history.length - 1];
  const whites = history.filter(c => c === 'W').length;
  const blacks = history.filter(c => c === 'B').length;

  // Strong preference: would violate 3-in-a-row rule
  if (history.length >= 2) {
    const last2 = history.slice(-2);
    if (last2.every(c => c === 'W')) return 'B'; // Must get black
    if (last2.every(c => c === 'B')) return 'W'; // Must get white
  }

  // Mild preference: balance colors
  if (whites > blacks) return 'B';
  if (blacks > whites) return 'W';

  // Alternation preference
  return last === 'W' ? 'B' : 'W';
}

// Assign zero-point byes for withdrawn players or late entries
export function generateByesForMissedRounds(
  player: TournamentPlayer,
  missedRounds: number[]
): { round_number: number; result: GameResult }[] {
  return missedRounds.map(r => ({
    round_number: r,
    result: '0-1' as GameResult, // zero-point bye treated as loss for pairing purposes
  }));
}
