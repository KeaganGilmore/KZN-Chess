/**
 * Lightweight SM-2-style spaced repetition for opening positions.
 * A "review" is one position the player must recall the continuation for.
 */

export interface ReviewState {
  reps: number;
  ease: number;
  interval_days: number;
}

const DAY_MS = 24 * 60 * 60 * 1000;

export function schedule(
  prev: ReviewState | null,
  correct: boolean
): { reps: number; ease: number; interval_days: number; dueOffsetMs: number } {
  let reps = prev?.reps ?? 0;
  let ease = prev?.ease ?? 2.5;
  let interval = prev?.interval_days ?? 0;

  if (correct) {
    reps += 1;
    if (reps === 1) interval = 1;
    else if (reps === 2) interval = 3;
    else interval = Math.round(interval * ease * 10) / 10;
    ease = Math.min(3.0, ease + 0.1);
    return { reps, ease, interval_days: interval, dueOffsetMs: interval * DAY_MS };
  }

  // Wrong: reset and re-show within the same session.
  ease = Math.max(1.3, ease - 0.2);
  return { reps: 0, ease, interval_days: 0, dueOffsetMs: 60 * 1000 };
}

/**
 * Higher = quiz sooner. Never-seen positions rank highest; otherwise weight by
 * how overdue it is plus its failure history.
 */
export function priority(
  review: { failures: number; due_at: string | null } | null,
  now: number
): number {
  if (!review) return Number.MAX_SAFE_INTEGER;
  const due = review.due_at ? new Date(review.due_at).getTime() : 0;
  return now - due + review.failures * 12 * 60 * 60 * 1000;
}
