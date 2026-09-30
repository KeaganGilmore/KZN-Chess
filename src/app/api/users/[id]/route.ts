import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { hashPassword } from '@/lib/passwords';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
// Never return password_hash to the client.
const SAFE_COLS = 'id, email, name, role, district_id, is_active, created_at, updated_at';

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
  if (body.is_tutor !== undefined) allowedFields.is_tutor = !!body.is_tutor;
  if (body.district_id !== undefined) allowedFields.district_id = body.district_id || null;

  if (body.name !== undefined) {
    const name = typeof body.name === 'string' ? body.name.trim() : '';
    if (!name) return NextResponse.json({ error: 'Name is required' }, { status: 400 });
    allowedFields.name = name;
  }

  if (body.email !== undefined) {
    const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }
    const { data: clash } = await supabase
      .from('users')
      .select('id')
      .eq('email', email)
      .neq('id', params.id)
      .maybeSingle();
    if (clash) {
      return NextResponse.json({ error: 'Another account already uses this email' }, { status: 409 });
    }
    allowedFields.email = email;
  }

  let passwordChanged = false;
  if (body.password !== undefined) {
    const password = typeof body.password === 'string' ? body.password : '';
    if (password.length < 8) {
      return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
    }
    allowedFields.password_hash = await hashPassword(password);
    passwordChanged = true;
  }

  if (Object.keys(allowedFields).length === 0) {
    return NextResponse.json({ error: 'No valid fields to update' }, { status: 400 });
  }

  // Admins cannot demote or deactivate their own account
  if (params.id === user.id && ((allowedFields.role && allowedFields.role !== 'admin') || allowedFields.is_active === false)) {
    return NextResponse.json(
      { error: 'You cannot demote or deactivate your own admin account' },
      { status: 400 }
    );
  }

  const { data, error } = await supabase
    .from('users')
    .update(allowedFields)
    .eq('id', params.id)
    .select(SAFE_COLS)
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  const { password_hash: _omit, ...loggedFields } = allowedFields;
  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: body.role ? 'user_role_changed' : passwordChanged ? 'user_password_reset' : 'user_updated',
    entity_type: 'user',
    entity_id: params.id,
    details: passwordChanged ? { ...loggedFields, password_reset: true } : loggedFields,
  });

  return NextResponse.json(data);
}

export async function DELETE(
  _request: NextRequest,
  { params }: { params: { id: string } }
) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  if (params.id === user.id) {
    return NextResponse.json({ error: 'You cannot delete your own account' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: target } = await supabase
    .from('users')
    .select('id, email, name')
    .eq('id', params.id)
    .maybeSingle();
  if (!target) {
    return NextResponse.json({ error: 'User not found' }, { status: 404 });
  }

  const { error } = await supabase.from('users').delete().eq('id', params.id);
  if (error) {
    // 23503: still referenced by tournaments, uploads, logs, etc.
    if (error.code === '23503') {
      return NextResponse.json(
        { error: 'This user has tournaments or other records linked to them. Ban them instead.' },
        { status: 409 }
      );
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'user_deleted',
    entity_type: 'user',
    entity_id: params.id,
    details: { email: target.email, name: target.name },
  });

  return NextResponse.json({ success: true });
}
