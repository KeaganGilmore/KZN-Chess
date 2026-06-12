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

  // Rejected tournaments are only visible to their organizer or an admin
  if (data.status === 'rejected') {
    const user = await getCurrentUser();
    if (!user || (user.role !== 'admin' && user.id !== data.organizer_id)) {
      return NextResponse.json({ error: 'Tournament not found' }, { status: 404 });
    }
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

  // Whitelist updatable columns; admins may additionally set status/is_verified
  const EDITABLE_FIELDS = [
    'name', 'description', 'date', 'end_date', 'start_time', 'venue',
    'venue_address', 'maps_link', 'time_control', 'time_control_detail',
    'rounds', 'entry_fee', 'prizes', 'is_rated', 'registration_procedure',
    'contact_name', 'contact_phone', 'contact_email', 'poster_url', 'district_id',
  ];
  const ADMIN_FIELDS = ['status', 'is_verified'];
  const VALID_STATUSES = ['pending', 'approved', 'rejected', 'featured'];

  const allowed = isAdmin ? [...EDITABLE_FIELDS, ...ADMIN_FIELDS] : EDITABLE_FIELDS;
  const update: Record<string, any> = {};
  for (const field of allowed) {
    if (field in body) update[field] = body[field];
  }

  if ('status' in update && !VALID_STATUSES.includes(update.status)) {
    return NextResponse.json({ error: 'Invalid status' }, { status: 400 });
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  const { data, error } = await supabase
    .from('tournaments')
    .update(update)
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
      action: `tournament_${update.status || 'updated'}`,
      entity_type: 'tournament',
      entity_id: params.id,
      details: update,
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
