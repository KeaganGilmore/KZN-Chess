import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { updateRating, DEFAULT_RATING } from '@/lib/puzzles/rating';

export async function POST(
  req: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const body = await req.json().catch(() => ({}));
  const correct = !!body.correct;
  const usedHint = !!body.used_hint;

  const supabase = createServerClient();
  const { data: puzzle } = await supabase
    .from('puzzles')
    .select('rating')
    .eq('id', params.id)
    .single();
  if (!puzzle) return NextResponse.json({ error: 'Puzzle not found' }, { status: 404 });

  const { data: existing } = await supabase
    .from('player_puzzle_stats')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const stats = existing || {
    rating: DEFAULT_RATING,
    solved: 0,
    failed: 0,
    current_streak: 0,
    best_streak: 0,
  };

  const plays = stats.solved + stats.failed;
  const score: 0 | 0.5 | 1 = correct ? (usedHint ? 0.5 : 1) : 0;
  const newRating = updateRating(stats.rating, puzzle.rating, score, plays);
  const solved = stats.solved + (correct ? 1 : 0);
  const failed = stats.failed + (correct ? 0 : 1);
  const currentStreak = correct && !usedHint ? stats.current_streak + 1 : 0;
  const bestStreak = Math.max(stats.best_streak, currentStreak);

  const now = new Date().toISOString();
  await supabase.from('player_puzzle_stats').upsert(
    {
      user_id: user.id,
      rating: newRating,
      solved,
      failed,
      current_streak: currentStreak,
      best_streak: bestStreak,
      last_played_at: now,
      updated_at: now,
    },
    { onConflict: 'user_id' }
  );

  await supabase.from('puzzle_attempts').insert({
    user_id: user.id,
    puzzle_id: params.id,
    correct,
    used_hint: usedHint,
    rating_before: stats.rating,
    rating_after: newRating,
  });

  return NextResponse.json({
    rating: newRating,
    rating_before: stats.rating,
    solved,
    failed,
    current_streak: currentStreak,
    best_streak: bestStreak,
  });
}
