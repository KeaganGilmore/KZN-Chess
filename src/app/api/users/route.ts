export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { hashPassword } from '@/lib/passwords';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
const VALID_ROLES = ['player', 'organizer', 'admin'];

const BASE_COLS =
  'id, email, name, role, district_id, is_active, created_at, updated_at, district:districts(id, name)';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createServerClient();
  // Never include password_hash in the response.
  let data: any = null;
  let error: any = null;
  ({ data, error } = await supabase
    .from('users')
    .select(`${BASE_COLS}, is_tutor`)
    .order('created_at', { ascending: false }));

  // Fall back gracefully if migration 008 (is_tutor) hasn't been applied yet.
  if (error && /is_tutor/i.test(error.message)) {
    ({ data, error } = await supabase
      .from('users')
      .select(BASE_COLS)
      .order('created_at', { ascending: false }));
  }

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json().catch(() => ({}));
  const name = typeof body.name === 'string' ? body.name.trim() : '';
  const email = typeof body.email === 'string' ? body.email.toLowerCase().trim() : '';
  const password = typeof body.password === 'string' ? body.password : '';
  const role = body.role || 'player';

  if (!name || !email || !password) {
    return NextResponse.json({ error: 'Name, email, and password are required' }, { status: 400 });
  }
  if (!EMAIL_RE.test(email)) {
    return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
  }
  if (password.length < 8) {
    return NextResponse.json({ error: 'Password must be at least 8 characters' }, { status: 400 });
  }
  if (!VALID_ROLES.includes(role)) {
    return NextResponse.json({ error: 'Invalid role' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data: existing } = await supabase
    .from('users')
    .select('id')
    .eq('email', email)
    .maybeSingle();
  if (existing) {
    return NextResponse.json({ error: 'An account with this email already exists' }, { status: 409 });
  }

  const { data, error } = await supabase
    .from('users')
    .insert({ name, email, role, password_hash: await hashPassword(password) })
    .select('id, email, name, role, is_active, created_at')
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'user_created',
    entity_type: 'user',
    entity_id: data.id,
    details: { email, name, role },
  });

  return NextResponse.json(data, { status: 201 });
}
