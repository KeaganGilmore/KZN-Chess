export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { productPatchSchema, productSchema } from '@/lib/store/validation';
import { getProductById } from '@/lib/store/catalog';
import { slugify } from '@/lib/store/slug';

type Ctx = { params: { id: string } };

export async function GET(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const product = await getProductById(params.id);
  if (!product) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }
  return NextResponse.json(product);
}

/**
 * PATCH takes the full product body. Variants are upserted by id (rows whose
 * id is missing from the body are deleted, rows without an id are inserted);
 * images are replaced wholesale in the given order.
 */
export async function PATCH(request: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const raw = await request.json().catch(() => null);
  const supabase = createServerClient();

  // Partial update (no variants/images in the body): only the supplied scalar
  // columns change and stock is never touched, so a stale admin screen can't
  // undo stock that checkouts have reduced in the meantime.
  if (raw && typeof raw === 'object' && !('variants' in raw) && !('images' in raw)) {
    const partial = productPatchSchema.safeParse(raw);
    if (!partial.success) {
      return NextResponse.json({ error: 'Invalid product', issues: partial.error.issues }, { status: 400 });
    }
    const fields = Object.fromEntries(
      Object.entries(partial.data).filter(([, v]) => v !== undefined)
    );
    if (Object.keys(fields).length === 0) {
      return NextResponse.json({ error: 'Nothing to update' }, { status: 400 });
    }
    const { data, error } = await supabase
      .from('products')
      .update({ ...fields, updated_at: new Date().toISOString() })
      .eq('id', params.id)
      .select('id')
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
      action: 'store_product_updated',
      entity_type: 'product',
      entity_id: params.id,
      details: fields,
    });
    revalidatePath('/');
    return NextResponse.json(await getProductById(params.id));
  }

  const parsed = productSchema.safeParse(raw);
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid product', issues: parsed.error.issues }, { status: 400 });
  }
  const { variants, images, ...p } = parsed.data;

  const existing = await getProductById(params.id);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  const slug = p.slug || existing.slug || slugify(p.name);
  if (slug !== existing.slug) {
    const { data: clash } = await supabase
      .from('products')
      .select('id')
      .eq('slug', slug)
      .neq('id', params.id)
      .maybeSingle();
    if (clash) {
      return NextResponse.json({ error: 'That slug is already in use' }, { status: 409 });
    }
  }

  const { error } = await supabase
    .from('products')
    .update({ ...p, slug, updated_at: new Date().toISOString() })
    .eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Variants: upsert by id, delete the ones no longer present.
  const keepIds = variants.filter((v) => v.id).map((v) => v.id as string);
  const { data: current } = await supabase
    .from('product_variants')
    .select('id')
    .eq('product_id', params.id);
  const toDelete = (current || []).map((r) => r.id as string).filter((id) => !keepIds.includes(id));
  if (toDelete.length) {
    // Variants that appear on past orders are deactivated rather than deleted,
    // so a later cancellation restocks the variant instead of the product.
    const { data: referenced } = await supabase
      .from('order_items')
      .select('variant_id')
      .in('variant_id', toDelete);
    const keepInactive = new Set((referenced || []).map((r) => r.variant_id as string));
    const hardDelete = toDelete.filter((id) => !keepInactive.has(id));
    if (keepInactive.size) {
      await supabase.from('product_variants').update({ is_active: false }).in('id', [...keepInactive]);
    }
    if (hardDelete.length) {
      await supabase.from('product_variants').delete().in('id', hardDelete);
    }
  }
  for (const [i, v] of variants.entries()) {
    const { id, ...fields } = v;
    const row = { ...fields, product_id: params.id, sort_order: i };
    const { error: ve } = id
      ? await supabase.from('product_variants').update(row).eq('id', id).eq('product_id', params.id)
      : await supabase.from('product_variants').insert(row);
    if (ve) {
      return NextResponse.json({ error: ve.message }, { status: 500 });
    }
  }

  // Images: replace wholesale in the given order.
  await supabase.from('product_images').delete().eq('product_id', params.id);
  if (images.length) {
    const { error: ie } = await supabase.from('product_images').insert(
      images.map((img, i) => ({ ...img, product_id: params.id, sort_order: i }))
    );
    if (ie) {
      return NextResponse.json({ error: ie.message }, { status: 500 });
    }
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'store_product_updated',
    entity_type: 'product',
    entity_id: params.id,
    details: { name: p.name, slug, is_active: p.is_active },
  });
  revalidatePath('/');

  return NextResponse.json(await getProductById(params.id));
}

export async function DELETE(_req: NextRequest, { params }: Ctx) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const supabase = createServerClient();

  const existing = await getProductById(params.id);
  if (!existing) {
    return NextResponse.json({ error: 'Not found' }, { status: 404 });
  }

  // Products referenced by orders are deactivated, not deleted, so history stays intact.
  const { count } = await supabase
    .from('order_items')
    .select('id', { count: 'exact', head: true })
    .eq('product_id', params.id);
  if ((count ?? 0) > 0) {
    const { error } = await supabase
      .from('products')
      .update({ is_active: false, is_featured: false, updated_at: new Date().toISOString() })
      .eq('id', params.id);
    if (error) {
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    await supabase.from('audit_logs').insert({
      admin_id: user.id,
      admin_email: user.email,
      action: 'store_product_deactivated',
      entity_type: 'product',
      entity_id: params.id,
      details: { name: existing.name, reason: 'has orders' },
    });
    revalidatePath('/');
    return NextResponse.json({ deactivated: true });
  }

  const { error } = await supabase.from('products').delete().eq('id', params.id);
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'store_product_deleted',
    entity_type: 'product',
    entity_id: params.id,
    details: { name: existing.name, slug: existing.slug },
  });
  revalidatePath('/');
  return NextResponse.json({ deleted: true });
}
