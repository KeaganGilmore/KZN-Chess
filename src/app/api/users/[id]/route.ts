import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export async function PATCH(
  request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const supabase = createServerClient();

  const VALID_ROLES = ['player', 'organizer', 'admin'];
  const allowedFields: Record<string, any> = {};
  if (body.role) {
    if (!VALID_ROLES.includes(body.role)) {
      return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
    }
    allowedFields.role = body.role;
  }
  if (body.is_active !== undefined) allowedFields.is_active = !!body.is_active;
  if (body.district_id !== undefined) allowedFields.district_id = body.district_id || null;

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Admins cannot demote or deactivate their own account
  if (params.id === user.id && (allowedFields.role === 'player' || allowedFields.role === 'organizer' || allowedFields.is_active === false)) {
    return NextResponse.json(
      { error: 'You cannot demote or deactivate your own admin account' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('users')
    .update(allowedFields)
    .eq('id', params.id)
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: `user_${body.role ? 'role_changed' : 'updated'}`,
    entity_type: 'user',
    entity_id: params.id,
    details: allowedFields,
  });

  return NextResponse.json(data);
}
