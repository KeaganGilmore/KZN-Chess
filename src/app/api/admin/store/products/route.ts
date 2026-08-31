export const dynamic = 'force-dynamic';
import { NextRequest, NextResponse } from 'next/server';
import { revalidatePath } from 'next/cache';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { productSchema } from '@/lib/store/validation';
import { listProducts, getProductById } from '@/lib/store/catalog';
import { slugify } from '@/lib/store/slug';

export async function GET(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }
  const q = new URL(request.url).searchParams.get('q') || undefined;
  return NextResponse.json(await listProducts({ q, includeInactive: true }));
}

async function uniqueSlug(
  supabase: ReturnType<typeof createServerClient>,
  base: string,
  excludeId?: string
) {
  let slug = base;
  let n = 2;
  for (;;) {
    let q = supabase.from('products').select('id').eq('slug', slug);
    if (excludeId) q = q.neq('id', excludeId);
    const { data } = await q.maybeSingle();
    if (!data) return slug;
    slug = `${base}-${n++}`;
  }
}

export async function POST(request: NextRequest) {
  const user = await getCurrentUser();
  if (!user || user.role !== 'admin') {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const parsed = productSchema.safeParse(await request.json().catch(() => null));
  if (!parsed.success) {
    return NextResponse.json({ error: 'Invalid product', issues: parsed.error.issues }, { status: 400 });
  }
  const { variants, images, ...p } = parsed.data;
  const supabase = createServerClient();
  const slug = await uniqueSlug(supabase, p.slug || slugify(p.name));

  const { data: product, error } = await supabase
    .from('products')
    .insert({ ...p, slug })
    .select('id')
    .single();
  if (error) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  // Insert variants one at a time (not a bulk insert) so each row's
  // freshly-generated id can be captured against its client_key, letting
  // images below reference "this variant" before it existed in the DB.
  const variantIdByKey = new Map<string, string>();
  for (const [i, v] of variants.entries()) {
    // Explicit column list (never `id`) — this is a create, so any `id` the
    // client sent is ignored rather than inserted.
    const { data: inserted, error: ve } = await supabase
      .from('product_variants')
      .insert({
        product_id: product.id,
        option_label: v.option_label,
        name: v.name,
        sku: v.sku,
        price_delta_cents: v.price_delta_cents,
        stock_qty: v.stock_qty,
        is_active: v.is_active,
        sort_order: v.sort_order ?? i,
      })
      .select('id')
      .single();
    if (ve) {
      return NextResponse.json({ error: ve.message }, { status: 500 });
    }
    variantIdByKey.set(v.client_key, inserted.id);
  }

  if (images.length) {
    const { error: ie } = await supabase.from('product_images').insert(
      images.map(({ variant_key, ...img }, i) => ({
        ...img,
        product_id: product.id,
        sort_order: i,
        variant_id: variant_key ? (variantIdByKey.get(variant_key) ?? null) : null,
      }))
    );
    if (ie) {
      return NextResponse.json({ error: ie.message }, { status: 500 });
    }
  }

  await supabase.from('audit_logs').insert({
    admin_id: user.id,
    admin_email: user.email,
    action: 'store_product_created',
    entity_type: 'product',
    entity_id: product.id,
    details: { name: p.name, slug },
  });
  revalidatePath('/');

  return NextResponse.json(await getProductById(product.id), { status: 201 });
}
