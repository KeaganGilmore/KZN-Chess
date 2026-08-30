export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { categorySchema } from '@/lib/store/validation';
import { listCategories } from '@/lib/store/catalog';
import { slugify } from '@/lib/store/slug';

export async function GET() {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  return NextResponse.json(await listCategories());
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = categorySchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid category', issues: parsed.error.issues }, { status: 400 });
  }
  const body = parsed.data;
  const slug = body.slug || slugify(body.name);
  const supabase = createServerClient();

  const { data, error } = await supabase
    .from('store_categories')
    .insert({ name: body.name, slug, sort_order: body.sort_order })
    .select()
    .single();
  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'A category with that slug already exists' }, { status: 409 });
    }
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'store_category_created',
    entity_type: 'store_category',
    entity_id: data.id,
    details: { name: body.name, slug },
  });
  revalidatePath('/');

  return NextResponse.json(data, { status: 201 });
}
