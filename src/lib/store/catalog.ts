import { createServerClient } from '@/lib/supabase/server';
import type { CollectionPoint, Product, StoreCategory, StoreSettings } from './types';
import { sortRelations } from './product-helpers';

export const PRODUCT_COLS =
  '*, category:store_categories(*), variants:product_variants(*), images:product_images(*)';

export const DEFAULT_SETTINGS: StoreSettings = {
  id: 1,
  store_enabled: false,
  delivery_enabled: true,
  collection_enabled: true,
  delivery_fee_cents: 0,
  free_delivery_threshold_cents: null,
  bank_details: null,
  whatsapp_number: null,
  store_name: 'KZN Chess Store',
  tagline: null,
  updated_at: '',
};

/** Settings row (id=1). Falls back to a disabled store if the migration is not applied. */
export async function getStoreSettings(): Promise<StoreSettings> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase.from('store_settings').select('*').eq('id', 1).maybeSingle();
    return (data as StoreSettings) || DEFAULT_SETTINGS;
  } catch {
    return DEFAULT_SETTINGS;
  }
}

export async function listCategories(): Promise<StoreCategory[]> {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('store_categories')
    .select('*')
    .order('sort_order')
    .order('name');
  return (data as StoreCategory[]) || [];
}

/** Strip characters that would break a PostgREST `or=` filter. */
function safeSearch(q: string): string {
  return q.replace(/[,()%]/g, ' ').trim().slice(0, 60);
}

export async function listProducts(
  opts: {
    categorySlug?: string;
    q?: string;
    featured?: boolean;
    includeInactive?: boolean;
    limit?: number;
  } = {}
): Promise<Product[]> {
  const supabase = createServerClient();
  let categoryId: string | null = null;
  if (opts.categorySlug) {
    const { data: cat } = await supabase
      .from('store_categories')
      .select('id')
      .eq('slug', opts.categorySlug)
      .maybeSingle();
    if (!cat) return [];
    categoryId = cat.id;
  }
  let q = supabase
    .from('products')
    .select(PRODUCT_COLS)
    .order('sort_order')
    .order('created_at', { ascending: false });
  if (!opts.includeInactive) q = q.eq('is_active', true);
  if (opts.featured) q = q.eq('is_featured', true);
  if (categoryId) q = q.eq('category_id', categoryId);
  if (opts.q) {
    const s = safeSearch(opts.q);
    if (s) q = q.or(`name.ilike.%${s}%,description.ilike.%${s}%`);
  }
  if (opts.limit) q = q.limit(opts.limit);
  const { data } = await q;
  return ((data as Product[]) || []).map(sortRelations);
}

export async function countActiveProducts(): Promise<number> {
  const supabase = createServerClient();
  const { count } = await supabase
    .from('products')
    .select('id', { count: 'exact', head: true })
    .eq('is_active', true);
  return count ?? 0;
}

export async function getProductBySlug(slug: string, includeInactive = false): Promise<Product | null> {
  const supabase = createServerClient();
  let q = supabase.from('products').select(PRODUCT_COLS).eq('slug', slug);
  if (!includeInactive) q = q.eq('is_active', true);
  const { data } = await q.maybeSingle();
  return data ? sortRelations(data as Product) : null;
}

export async function getProductById(id: string): Promise<Product | null> {
  const supabase = createServerClient();
  const { data } = await supabase.from('products').select(PRODUCT_COLS).eq('id', id).maybeSingle();
  return data ? sortRelations(data as Product) : null;
}

/** Fetch products for pricing — includes inactive rows so priceCart can flag them. */
export async function getProductsByIds(ids: string[]): Promise<Product[]> {
  if (ids.length === 0) return [];
  const supabase = createServerClient();
  const { data } = await supabase.from('products').select(PRODUCT_COLS).in('id', ids);
  return ((data as Product[]) || []).map(sortRelations);
}

export async function listCollectionPoints(activeOnly = true): Promise<CollectionPoint[]> {
  const supabase = createServerClient();
  let q = supabase.from('collection_points').select('*').order('sort_order').order('name');
  if (activeOnly) q = q.eq('is_active', true);
  const { data } = await q;
  return (data as CollectionPoint[]) || [];
}

export async function getCollectionPoint(id: string): Promise<CollectionPoint | null> {
  const supabase = createServerClient();
  const { data } = await supabase.from('collection_points').select('*').eq('id', id).maybeSingle();
  return (data as CollectionPoint) || null;
}
