/**
 * Tiebreak calculators for chess tournaments
 * All tiebreaks are pure functions that recalculate from scratch.
 */

import type {
  TournamentPlayer,
  TournamentPairing,
  TournamentRound,
  TournamentSettings,
  TiebreakMethod,
  PlayerStanding,
  PlayerGame,
  GameResult,
} from '@/lib/types';

interface PlayerData {
  player: TournamentPlayer;
  points: number;
  games: PlayerGame[];
  roundScores: number[]; // score per round (not cumulative)
}

function getPointsForResult(
  result: GameResult | null,
  side: 'white' | 'black',
  settings: TournamentSettings
): number {
  if (!result) return 0;
  switch (result) {
    case '1-0': return side === 'white' ? settings.point_win : settings.point_loss;
    case '0-1': return side === 'black' ? settings.point_win : settings.point_loss;
    case 'draw': return settings.point_draw;
    case 'white_forfeit': return side === 'white' ? settings.point_win : settings.point_loss;
    case 'black_forfeit': return side === 'black' ? settings.point_win : settings.point_loss;
    case 'double_forfeit': return settings.point_loss;
    case 'bye': return settings.point_bye;
    case 'half_bye': return settings.point_half_bye;
    default: return 0;
  }
}

function buildPlayerData(
  players: TournamentPlayer[],
  rounds: TournamentRound[],
  pairings: TournamentPairing[],
  settings: TournamentSettings
): Map<string, PlayerData> {
  const dataMap = new Map<string, PlayerData>();

  for (const p of players) {
    dataMap.set(p.id, {
      player: p,
      points: 0,
      games: [],
      roundScores: [],
    });
  }

  // Group pairings by round
  const pairingsByRound = new Map<string, TournamentPairing[]>();
  for (const p of pairings) {
    const list = pairingsByRound.get(p.round_id) || [];
    list.push(p);
    pairingsByRound.set(p.round_id, list);
  }

  // Sort rounds by round_number
  const sortedRounds = [...rounds].sort((a, b) => a.round_number - b.round_number);

  for (const round of sortedRounds) {
    const roundPairings = pairingsByRound.get(round.id) || [];

    // Track which players had a game this round
    const playedThisRound = new Set<string>();

    for (const pairing of roundPairings) {
      const whiteData = dataMap.get(pairing.white_player_id);

      if (pairing.is_bye && whiteData) {
        const pts = getPointsForResult(pairing.result, 'white', settings);
        whiteData.points += pts;
        whiteData.roundScores.push(pts);
        whiteData.games.push({
          round_number: round.round_number,
          opponent_id: null,
          opponent_name: null,
          opponent_rating: null,
          color: null,
          result: pairing.result,
          points: pts,
          board_number: pairing.board_number,
        });
        playedThisRound.add(pairing.white_player_id);
        continue;
      }

      if (!pairing.black_player_id) continue;
      const blackData = dataMap.get(pairing.black_player_id);

      if (whiteData) {
        const pts = getPointsForResult(pairing.result, 'white', settings);
        whiteData.points += pts;
        whiteData.roundScores.push(pts);
        const oppPlayer = blackData?.player;
        whiteData.games.push({
          round_number: round.round_number,
          opponent_id: pairing.black_player_id,
          opponent_name: oppPlayer?.player_name || null,
          opponent_rating: oppPlayer ? (oppPlayer.fide_rating || oppPlayer.national_rating || null) : null,
          color: 'W',
          result: pairing.result,
          points: pts,
          board_number: pairing.board_number,
        });
        playedThisRound.add(pairing.white_player_id);
      }

      if (blackData) {
        const pts = getPointsForResult(pairing.result, 'black', settings);
        blackData.points += pts;
        blackData.roundScores.push(pts);
        const oppPlayer = whiteData?.player;
        blackData.games.push({
          round_number: round.round_number,
          opponent_id: pairing.white_player_id,
          opponent_name: oppPlayer?.player_name || null,
          opponent_rating: oppPlayer ? (oppPlayer.fide_rating || oppPlayer.national_rating || null) : null,
          color: 'B',
          result: pairing.result,
          points: pts,
          board_number: pairing.board_number,
        });
        playedThisRound.add(pairing.black_player_id);
      }
    }

    // Players who didn't play this round get 0 for that round
    for (const [id, data] of dataMap) {
      if (!playedThisRound.has(id) && data.roundScores.length < round.round_number) {
        data.roundScores.push(0);
      }
    }
  }

  return dataMap;
}

// ============================================
// Individual tiebreak calculators
// ============================================

/** Buchholz: sum of all opponents' final scores */
function buchholz(playerData: PlayerData, allData: Map<string, PlayerData>): number {
  let sum = 0;
  for (const game of playerData.games) {
    if (game.opponent_id) {
      const opp = allData.get(game.opponent_id);
      sum += opp ? opp.points : 0;
    }
  }
  return sum;
}

/** Buchholz Cut 1: Buchholz minus the lowest opponent score */
function buchholzCut1(playerData: PlayerData, allData: Map<string, PlayerData>): number {
  const oppScores: number[] = [];
  for (const game of playerData.games) {
    if (game.opponent_id) {
      const opp = allData.get(game.opponent_id);
      oppScores.push(opp ? opp.points : 0);
    }
  }
  if (oppScores.length === 0) return 0;
  oppScores.sort((a, b) => a - b);
  return oppScores.slice(1).reduce((s, v) => s + v, 0);
}

/** Median Buchholz: excluding highest and lowest opponent scores */
function medianBuchholz(playerData: PlayerData, allData: Map<string, PlayerData>): number {
  const oppScores: number[] = [];
  for (const game of playerData.games) {
    if (game.opponent_id) {
      const opp = allData.get(game.opponent_id);
      oppScores.push(opp ? opp.points : 0);
    }
  }
  if (oppScores.length <= 2) return oppScores.reduce((s, v) => s + v, 0);
  oppScores.sort((a, b) => a - b);
  return oppScores.slice(1, -1).reduce((s, v) => s + v, 0);
}

/** Sonneborn-Berger: sum of beaten opponents' scores + half of drawn opponents' scores */
function sonnebornBerger(playerData: PlayerData, allData: Map<string, PlayerData>, settings: TournamentSettings): number {
  let sum = 0;
  for (const game of playerData.games) {
    if (!game.opponent_id) continue;
    const opp = allData.get(game.opponent_id);
    if (!opp) continue;

    if (game.points === settings.point_win) {
      sum += opp.points;
    } else if (game.points === settings.point_draw) {
      sum += opp.points / 2;
    }
  }
  return sum;
}

/** Progressive/Cumulative: running total of score after each round */
function progressive(playerData: PlayerData): number {
  let cumulative = 0;
  let sum = 0;
  for (const roundScore of playerData.roundScores) {
    cumulative += roundScore;
    sum += cumulative;
  }
  return sum;
}

/** Direct Encounter: head-to-head between tied players (simplified - returns points scored vs tied group) */
function directEncounter(playerData: PlayerData, tiedPlayerIds: Set<string>): number {
  let sum = 0;
  for (const game of playerData.games) {
    if (game.opponent_id && tiedPlayerIds.has(game.opponent_id)) {
      sum += game.points;
    }
  }
  return sum;
}

/** Average Rating of Opponents */
function aro(playerData: PlayerData, allData: Map<string, PlayerData>, ratingType: string): number {
  const ratings: number[] = [];
  for (const game of playerData.games) {
    if (game.opponent_id) {
      const opp = allData.get(game.opponent_id);
      if (opp) {
        const p = opp.player;
        const r = ratingType === 'fide' ? (p.fide_rating || 0)
          : ratingType === 'national' ? (p.national_rating || 0)
          : (p.fide_rating || p.national_rating || 0);
        if (r > 0) ratings.push(r);
      }
    }
  }
  return ratings.length > 0 ? ratings.reduce((s, v) => s + v, 0) / ratings.length : 0;
}

/** Number of wins */
function numWins(playerData: PlayerData, settings: TournamentSettings): number {
  return playerData.games.filter(g => g.points === settings.point_win).length;
}

/** Number of games with Black */
function numBlacks(playerData: PlayerData): number {
  return playerData.games.filter(g => g.color === 'B').length;
}

// ============================================
// Main standings calculator
// ============================================

export function calculateStandings(
  players: TournamentPlayer[],
  rounds: TournamentRound[],
  pairings: TournamentPairing[],
  settings: TournamentSettings
): PlayerStanding[] {
  const activePlayers = players.filter(p => p.is_approved);
  const allData = buildPlayerData(activePlayers, rounds, pairings, settings);
  const tiebreakOrder = settings.tiebreak_order;

  // Calculate tiebreaks for each player
  const standings: PlayerStanding[] = [];

  for (const [, data] of allData) {
    const tiebreaks: Record<TiebreakMethod, number> = {
      buchholz: 0,
      buchholz_cut1: 0,
      median_buchholz: 0,
      sonneborn_berger: 0,
      progressive: 0,
      direct_encounter: 0,
      aro: 0,
      num_wins: 0,
      num_blacks: 0,
    };

    // Calculate all tiebreaks (direct_encounter is deferred)
    tiebreaks.buchholz = buchholz(data, allData);
    tiebreaks.buchholz_cut1 = buchholzCut1(data, allData);
    tiebreaks.median_buchholz = medianBuchholz(data, allData);
    tiebreaks.sonneborn_berger = sonnebornBerger(data, allData, settings);
    tiebreaks.progressive = progressive(data);
    tiebreaks.aro = aro(data, allData, settings.rating_type);
    tiebreaks.num_wins = numWins(data, settings);
    tiebreaks.num_blacks = numBlacks(data);

    // Build cumulative round scores
    const roundScores: number[] = [];
    let cum = 0;
    for (const rs of data.roundScores) {
      cum += rs;
      roundScores.push(cum);
    }

    standings.push({
      player: data.player,
      rank: 0,
      points: data.points,
      tiebreaks,
      games: data.games,
      roundScores,
    });
  }

  // Now calculate direct encounter for tied groups
  // Group by points
  const pointGroups = new Map<number, PlayerStanding[]>();
  for (const s of standings) {
    const group = pointGroups.get(s.points) || [];
    group.push(s);
    pointGroups.set(s.points, group);
  }

  for (const [, group] of pointGroups) {
    if (group.length > 1) {
      const tiedIds = new Set(group.map(s => s.player.id));
      for (const s of group) {
        const data = allData.get(s.player.id)!;
        s.tiebreaks.direct_encounter = directEncounter(data, tiedIds);
      }
    }
  }

  // Sort by points desc, then by tiebreak order
  standings.sort((a, b) => {
    if (b.points !== a.points) return b.points - a.points;
    for (const tb of tiebreakOrder) {
      const diff = (b.tiebreaks[tb] || 0) - (a.tiebreaks[tb] || 0);
      if (Math.abs(diff) > 0.001) return diff;
    }
    // Final tiebreak: starting rank
    return (a.player.starting_rank || 0) - (b.player.starting_rank || 0);
  });

  // Assign ranks
  standings.forEach((s, i) => (s.rank = i + 1));

  return standings;
}

/** Calculate performance rating for a player */
export function calculatePerformanceRating(
  games: PlayerGame[],
  totalPoints: number
): number | null {
  const opponentRatings = games
    .filter(g => g.opponent_rating && g.opponent_rating > 0)
    .map(g => g.opponent_rating!);

  if (opponentRatings.length === 0) return null;

  const avgRating = opponentRatings.reduce((s, v) => s + v, 0) / opponentRatings.length;
  const percentage = totalPoints / games.length;

  // FIDE performance rating formula approximation
  // dp table (difference from average rating based on percentage score)
  const dpTable: [number, number][] = [
    [1.00, 800], [0.99, 677], [0.98, 589], [0.97, 538],
    [0.96, 501], [0.95, 470], [0.94, 444], [0.93, 422],
    [0.92, 401], [0.91, 383], [0.90, 366], [0.89, 351],
    [0.88, 336], [0.87, 322], [0.86, 309], [0.85, 296],
    [0.84, 284], [0.83, 273], [0.82, 262], [0.81, 251],
    [0.80, 240], [0.79, 230], [0.78, 220], [0.77, 211],
    [0.76, 202], [0.75, 193], [0.74, 184], [0.73, 175],
    [0.72, 166], [0.71, 158], [0.70, 149], [0.69, 141],
    [0.68, 133], [0.67, 125], [0.66, 117], [0.65, 110],
    [0.64, 102], [0.63, 95], [0.62, 87], [0.61, 80],
    [0.60, 72], [0.59, 65], [0.58, 57], [0.57, 50],
    [0.56, 43], [0.55, 36], [0.54, 29], [0.53, 21],
    [0.52, 14], [0.51, 7], [0.50, 0],
    [0.49, -7], [0.48, -14], [0.47, -21], [0.46, -29],
    [0.45, -36], [0.44, -43], [0.43, -50], [0.42, -57],
    [0.41, -65], [0.40, -72], [0.39, -80], [0.38, -87],
    [0.37, -95], [0.36, -102], [0.35, -110], [0.34, -117],
    [0.33, -125], [0.32, -133], [0.31, -141], [0.30, -149],
    [0.29, -158], [0.28, -166], [0.27, -175], [0.26, -184],
    [0.25, -193], [0.24, -202], [0.23, -211], [0.22, -220],
    [0.21, -230], [0.20, -240], [0.19, -251], [0.18, -262],
    [0.17, -273], [0.16, -284], [0.15, -296], [0.14, -309],
    [0.13, -322], [0.12, -336], [0.11, -351], [0.10, -366],
    [0.09, -383], [0.08, -401], [0.07, -422], [0.06, -444],
    [0.05, -470], [0.04, -501], [0.03, -538], [0.02, -589],
    [0.01, -677], [0.00, -800],
  ];

  // Find closest percentage match
  let dp = 0;
  for (const [pct, diff] of dpTable) {
    if (percentage >= pct) {
      dp = diff;
      break;
    }
  }

  return Math.round(avgRating + dp);
}
