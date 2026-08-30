export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { settingsSchema } from '@/lib/store/validation';
import { getStoreSettings } from '@/lib/store/catalog';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(await getStoreSettings());
}

export async function PATCH(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = settingsSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid settings', issues: parsed.error.issues }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('store_settings')
    .upsert({ id: 1, ...parsed.data, updated_at: new Date().toISOString() })
    .select()
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'store_settings_updated',
    entity_type: 'store_settings',
    entity_id: null,
    details: parsed.data,
  });
  // The homepage is ISR-cached; opening/closing the store must show immediately.
  revalidatePath('/');

  return NextResponse.json(data);
}
