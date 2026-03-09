import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('tournaments')
    .select('*, district:districts(*), organizer:users(id, name, email)')
    .eq('id', params.id)
    .single();

  if (error) {
    return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
  }

  return NextResponse.json(data);
}

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const supabase = createServerClient();
  const isAdmin = user.role === 'admin';

  // Check if user is the tournament owner (non-admins only)
  if (!isAdmin) {
    const { data: tournament } = await supabase
      .from('tournaments')
      .select('organizer_id')
      .eq('id', params.id)
      .single();

    if (!tournament || tournament.organizer_id !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }
  }

  const body = await request.json();

  // Non-admin owners cannot change status or verification
  if (!isAdmin) {
    delete body.status;
    delete body.is_verified;
  }

  const { data, error } = await supabase
    .from('tournaments')
    .update(body)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Log admin actions
  if (isAdmin) {
    await supabase.from('audit_logs').insert({
      admin_id: user.id,
      admin_email: user.email,
      action: `tournament_${body.status || 'updated'}`,
      entity_type: 'tournament',
      entity_id: params.id,
      details: body,
    });
  }

  return NextResponse.json(data);
}

export async function DELETE(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createServerClient();
  const { error } = await supabase
    .from('tournaments')
    .delete()
    .eq('id', params.id);

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'tournament_deleted',
    entity_type: 'tournament',
    entity_id: params.id,
  });

  return NextResponse.json({ success: true });
}
