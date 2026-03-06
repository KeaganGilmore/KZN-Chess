import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';

export const dynamic = 'force-dynamic';

export async function GET() {
  const supabase = createServerClient();
  const { data, error } = await supabase.from('site_content').select('*');

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  return NextResponse.json(data);
}

export async function PUT(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const { key, value } = await request.json();
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('site_content')
    .upsert(
      { key, value, updated_by: user.id },
      { onConflict: 'key' }
    )
    .select()
    .single();

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'content_updated',
    entity_type: 'site_content',
    details: { key },
  });

  return NextResponse.json(data);
}
