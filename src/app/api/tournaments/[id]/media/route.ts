import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('tournament_media')
    .select('*, uploader:users(id, name)')
    .eq('tournament_id', params.id)
    .order('created_at', { ascending: false });

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { url, caption, media_type } = await request.json();
  if (!url || typeof url !== 'string') {
    return NextResponse.json({ error: 'URL is required' }, { status: 400 });
  }
  if (media_type && !['image', 'poster'].includes(media_type)) {
    return NextResponse.json({ error: 'Invalid media type' }, { status: 400 });
  }

  const supabase = createServerClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('id')
    .eq('id', params.id)
    .single();
  if (!tournament) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  const { data, error } = await supabase
    .from('tournament_media')
    .insert({
      tournament_id: params.id,
      uploaded_by: user.id,
      url,
      caption: caption || null,
      media_type: media_type || 'image',
    })
    .select('*, uploader:users(id, name)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}
