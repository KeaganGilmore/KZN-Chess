import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET() {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ stats: null, history: [] });

  const supabase = createServerClient();
  const { data: stats } = await supabase
    .from('player_puzzle_stats')
    .select('*')
    .eq('user_id', user.id)
    .maybeSingle();

  const { data: history } = await supabase
    .from('puzzle_attempts')
    .select('rating_after, correct, created_at')
    .eq('user_id', user.id)
    .order('created_at', { ascending: false })
    .limit(30);

  return NextResponse.json({
    stats: stats || null,
    history: (history || []).reverse(),
  });
}
