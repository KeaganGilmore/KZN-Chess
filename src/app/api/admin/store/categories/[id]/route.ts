export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { categoryPatchSchema } from '@/lib/store/validation';

type Ctx = { params: { id: string } };

// Partial (no defaults) so a rename or reorder never resets the other fields.
const patchSchema = categoryPatchSchema;

export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = patchSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid category', issues: parsed.error.issues }, { status: 400 });
  }

  const fields: { name?: string; slug?: string; sort_order?: number } = {};
  if (parsed.data.name !== undefined) fields.name = parsed.data.name;
  if (parsed.data.slug !== undefined) fields.slug = parsed.data.slug;
  if (parsed.data.sort_order !== undefined) fields.sort_order = parsed.data.sort_order;
  if (Object.keys(fields).length === 0) {
    return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
  }

  const supabase = createServerClient();
  const { data, error } = await supabase
    .from('store_categories')
    .update(fields)
    .eq('id', params.id)
    .select()
    .maybeSingle();
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A category with that slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  if (!data) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'store_category_updated',
    entity_type: 'store_category',
    entity_id: params.id,
    details: fields,
  });
  revalidatePath('/');

  return NextResponse.json(data);
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const supabase = createServerClient();
  // Products keep their data; the FK is ON DELETE SET NULL so they simply lose the category.
  const { data, error } = await supabase
    .from('store_categories')
    .delete()
    .eq('id', params.id)
    .select('id, name, slug')
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
    action: 'store_category_deleted',
    entity_type: 'store_category',
    entity_id: params.id,
    details: { name: data.name, slug: data.slug },
  });
  revalidatePath('/');

  return NextResponse.json({ deleted: true });
}
