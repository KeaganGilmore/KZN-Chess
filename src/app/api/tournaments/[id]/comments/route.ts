import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('tournament_comments')
    .select('*, user:users(id, name, role, is_active)')
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

  const { content } = await request.json();
  if (!content?.trim()) {
    return NextResponse.json({ error: 'Comment cannot be empty' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Check if user is banned
  const { data: userData } = await supabase
    .from('users')
    .select('is_active')
    .eq('id', user.id)
    .single();

  if (!userData?.is_active) {
    return NextResponse.json({ error: 'Your account has been suspended' }, { status: 403 });
  }

  const { data, error } = await supabase
    .from('tournament_comments')
    .insert({
      tournament_id: params.id,
      user_id: user.id,
      content: content.trim(),
    })
    .select('*, user:users(id, name, role, is_active)')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { commentId } = await request.json();
  if (!commentId) {
    return NextResponse.json({ error: 'Comment ID required' }, { status: 400 });
  }

  const supabase = createServerClient();

  // Check ownership or admin
  const { data: comment } = await supabase
    .from('tournament_comments')
    .select('user_id')
    .eq('id', commentId)
    .single();

  if (!comment) {
    return NextResponse.json({ error: 'Comment not found' }, { status: 404 });
  }

  if (comment.user_id !== user.id && user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  await supabase
    .from('tournament_comments')
    .delete()
    .eq('id', commentId);

  return NextResponse.json({ success: true });
}
