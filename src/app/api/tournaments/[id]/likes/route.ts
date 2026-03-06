import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const user = await getCurrentUser();

  const { count } = await supabase
    .from('tournament_likes')
    .select('*', { count: 'exact', head: true })
    .eq('tournament_id', params.id);

  let userLiked = false;
  if (user) {
    const { data } = await supabase
      .from('tournament_likes')
      .select('id')
      .eq('tournament_id', params.id)
      .eq('user_id', user.id)
      .maybeSingle();
    userLiked = !!data;
  }

  return NextResponse.json({ count: count || 0, userLiked });
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();

  // Check if already liked
  const { data: existing } = await supabase
    .from('tournament_likes')
    .select('id')
    .eq('tournament_id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();

  if (existing) {
    // Unlike
    await supabase
      .from('tournament_likes')
      .delete()
      .eq('id', existing.id);
    return NextResponse.json({ liked: false });
  }

  // Like
  await supabase
    .from('tournament_likes')
    .insert({
      tournament_id: params.id,
      user_id: user.id,
    });

  return NextResponse.json({ liked: true });
}
