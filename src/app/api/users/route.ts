export const dynamic = 'force-dynamic';
import { NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

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
