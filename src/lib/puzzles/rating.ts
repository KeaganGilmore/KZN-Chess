/**
 * Simplified Elo-style puzzle rating (Glicko-lite). The K-factor tapers as the
 * player completes more puzzles, so early results move the rating quickly and
 * it stabilises over time. Hint-assisted solves count as a half score.
 */

export const MIN_RATING = 600;
export const MAX_RATING = 3000;
export const DEFAULT_RATING = 1200;

export function expectedScore(playerRating: number, puzzleRating: number): number {
  return 1 / (1 + Math.pow(10, (puzzleRating - playerRating) / 400));
}

export function kFactor(playsCount: number): number {
  if (playsCount < 30) return 40;
  if (playsCount < 100) return 24;
  return 16;
}

/** score: 1 = solved cleanly, 0.5 = solved with a hint, 0 = failed. */
export function updateRating(
  playerRating: number,
  puzzleRating: number,
  score: 0 | 0.5 | 1,
  playsCount: number
): number {
  const expected = expectedScore(playerRating, puzzleRating);
  const next = Math.round(playerRating + kFactor(playsCount) * (score - expected));
  return Math.max(MIN_RATING, Math.min(MAX_RATING, next));
}

/** Rating window for serving "next" puzzles near the player's level. */
export function ratingBand(playerRating: number): { min: number; max: number } {
  return { min: playerRating - 100, max: playerRating + 150 };
}
