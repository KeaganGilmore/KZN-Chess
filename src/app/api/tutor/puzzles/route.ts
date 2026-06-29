import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getTutor } from '@/lib/tutor/access';

export async function GET(req: NextRequest) {
  const tutor = await getTutor();
  if (!tutor) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

  const url = new URL(req.url);
  const theme = url.searchParams.get('theme');
  const min = parseInt(url.searchParams.get('min') || '', 10);
  const max = parseInt(url.searchParams.get('max') || '', 10);
  const limit = Math.min(parseInt(url.searchParams.get('limit') || '30', 10) || 30, 100);

  const supabase = createServerClient();
  let q = supabase
    .from('puzzles')
    .select('id, fen, moves, rating, themes')
    .order('popularity', { ascending: false })
    .limit(limit);
  if (!Number.isNaN(min)) q = q.gte('rating', min);
  if (!Number.isNaN(max)) q = q.lte('rating', max);
  if (theme) q = q.contains('themes', [theme]);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ puzzles: data || [] });
}
