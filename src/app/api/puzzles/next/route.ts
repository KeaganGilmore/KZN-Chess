import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { ratingBand, DEFAULT_RATING } from '@/lib/puzzles/rating';

const COLS = 'id, fen, moves, rating, themes';

// Serve a puzzle near the player's rating (or an explicit ?rating=), optionally
// filtered by ?theme=. Picks randomly from a band so repeats are rare.
export async function GET(req: NextRequest) {
  const supabase = createServerClient();
  const url = new URL(req.url);
  const theme = url.searchParams.get('theme');
  let rating = parseInt(url.searchParams.get('rating') || '', 10);

  if (Number.isNaN(rating)) {
    const user = await getCurrentUser();
    if (user) {
      const { data } = await supabase
        .from('player_puzzle_stats')
        .select('rating')
        .eq('user_id', user.id)
        .maybeSingle();
      rating = data?.rating ?? DEFAULT_RATING;
    } else {
      rating = DEFAULT_RATING;
    }
  }

  const { min, max } = ratingBand(rating);
  let q = supabase.from('puzzles').select(COLS).gte('rating', min).lte('rating', max).limit(50);
  if (theme) q = q.contains('themes', [theme]);

  let { data } = await q;
  if (!data || data.length === 0) {
    // Fallback: anything available (e.g. sparse library after a partial import).
    const res = await supabase.from('puzzles').select(COLS).limit(50);
    data = res.data || [];
  }
  if (data.length === 0) return NextResponse.json({ puzzle: null });

  return NextResponse.json({ puzzle: data[Math.floor(Math.random() * data.length)] });
}
