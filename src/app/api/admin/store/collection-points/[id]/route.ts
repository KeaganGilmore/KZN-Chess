export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { collectionPointPatchSchema } from '@/lib/store/validation';

type Ctx = { params: { id: string } };

// Partial (no defaults) so editing one field never re-enables a hidden point
// or resets its sort order.
const patchSchema = collectionPointPatchSchema;

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json(
      { error: 'Invalid collection point', issues: parsed.error.issues },
      { status: 400 }
    );
  }

  // Only send the keys that were actually provided so untouched columns stay as they are.
  const fields: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(parsed.data)) {
    if (value !== undefined) fields[key] = value;
  }
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('collection_points')
    .update(fields)
    .eq('id', params.id)
    .select()
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'store_collection_point_updated',
    entity_type: 'collection_point',
    entity_id: params.id,
    details: fields,
  });

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createServerClient();
  // Orders snapshot collection_point_name and the FK is ON DELETE SET NULL, so history is safe.
  const { data, error } = await supabase
    .from('collection_points')
    .delete()
    .eq('id', params.id)
    .select('id, name')
    .maybeSingle();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'store_collection_point_deleted',
    entity_type: 'collection_point',
    entity_id: params.id,
    details: { name: data.name },
  });

  return NextResponse.json({ deleted: true });
}
