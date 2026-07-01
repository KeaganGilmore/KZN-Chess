/**
 * Chessable-style 8-level spaced repetition. Each repertoire node is its own
 * card. A correct answer promotes one level (capped at 7); a wrong answer drops
 * straight back to level 0.
 */

export const INTERVALS_MS = [
  4 * 3600000, //     L0 -> 4 hours
  86400000, //        L1 -> 1 day
  3 * 86400000, //    L2 -> 3 days
  7 * 86400000, //    L3 -> 1 week
  14 * 86400000, //   L4 -> 2 weeks
  30 * 86400000, //   L5 -> 1 month
  90 * 86400000, //   L6 -> 3 months
  180 * 86400000, //  L7 -> 6 months
];

export const MAX_LEVEL = INTERVALS_MS.length - 1; // 7

export interface Graded {
  level: number;
  nextReviewMs: number; // interval from "now"
}

/** Apply an answer to a card's current level. */
export function grade(level: number, correct: boolean): Graded {
  if (correct) {
    const next = Math.min(level + 1, MAX_LEVEL);
    return { level: next, nextReviewMs: INTERVALS_MS[next] };
  }
  return { level: 0, nextReviewMs: INTERVALS_MS[0] };
}

/** Human label for a level (for UI). */
export function levelLabel(level: number): string {
  const labels = ['New', '1 day', '3 days', '1 week', '2 weeks', '1 month', '3 months', '6 months'];
  return labels[Math.max(0, Math.min(level, MAX_LEVEL))];
}

/**
 * A node is a "weak spot" when it has been failed repeatedly, or has been reset
 * to level 0 after at least one failure.
 */
export function isWeakSpot(r: { sr_level: number; fail_count: number }): boolean {
  return r.fail_count >= 3 || (r.sr_level === 0 && r.fail_count > 0);
}
