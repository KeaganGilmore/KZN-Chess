import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { getTournamentRole } from '@/lib/tournament/access';

export async function GET(
  _request: Request,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('tournament_arbiters')
    .select('*, user:users(id, name, email)')
    .eq('tournament_id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json(data);
}

export async function POST(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  // Only directors and admins can appoint arbiters
  const role = await getTournamentRole(params.id, user.id);
  if (role !== 'director' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Only directors can appoint arbiters' }, { status: 403 });
  }

  const body = await request.json();
  const { user_id, arbiter_role } = body;

  if (!user_id) return NextResponse.json({ error: 'user_id required' }, { status: 400 });

  const supabase = createServerClient();

  // Verify the user exists
  const { data: targetUser } = await supabase
    .from('users')
    .select('id')
    .eq('id', user_id)
    .single();

  if (!targetUser) return NextResponse.json({ error: 'User not found' }, { status: 404 });

  const { data, error } = await supabase
    .from('tournament_arbiters')
    .upsert({
      tournament_id: params.id,
      user_id,
      role: arbiter_role || 'arbiter',
    }, { onConflict: 'tournament_id,user_id' })
    .select('*, user:users(id, name, email)')
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json(data, { status: 201 });
}

export async function DELETE(
  request: Request,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  const role = await getTournamentRole(params.id, user.id);
  if (role !== 'director' && user.role !== 'admin') {
    return NextResponse.json({ error: 'Only directors can remove arbiters' }, { status: 403 });
  }

  const { searchParams } = new URL(request.url);
  const arbiterId = searchParams.get('arbiter_id');
  if (!arbiterId) return NextResponse.json({ error: 'arbiter_id required' }, { status: 400 });

  const supabase = createServerClient();
  const { error } = await supabase
    .from('tournament_arbiters')
    .delete()
    .eq('id', arbiterId)
    .eq('tournament_id', params.id);

  if (error) return NextResponse.json({ error: error.message }, { status: 400 });
  return NextResponse.json({ success: true });
}
