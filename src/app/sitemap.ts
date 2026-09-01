import type { MetadataRoute } from 'next';
import { SITE_URL } from '@/lib/site';
import { listProducts } from '@/lib/store/catalog';
import { createServerClient } from '@/lib/supabase/server';

const STATIC_ROUTES: Array<{ path: string; changeFrequency: MetadataRoute.Sitemap[number]['changeFrequency']; priority: number }> = [
  { path: '', changeFrequency: 'daily', priority: 1 },
  { path: '/store', changeFrequency: 'daily', priority: 0.9 },
  { path: '/tournaments', changeFrequency: 'daily', priority: 0.9 },
  { path: '/gallery', changeFrequency: 'weekly', priority: 0.5 },
  { path: '/about', changeFrequency: 'monthly', priority: 0.4 },
  { path: '/learn', changeFrequency: 'weekly', priority: 0.5 },
];

async function listPublicTournaments(): Promise<{ id: string; updated_at: string }[]> {
  try {
    const supabase = createServerClient();
    const { data } = await supabase
      .from('tournaments')
      .select('id, updated_at')
      .in('status', ['approved', 'featured'])
      .order('date', { ascending: false });
    return data || [];
  } catch {
    return [];
  }
}

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const [products, tournaments] = await Promise.all([
    listProducts().catch(() => []),
    listPublicTournaments(),
  ]);

  const staticEntries: MetadataRoute.Sitemap = STATIC_ROUTES.map((r) => ({
    url: `${SITE_URL}${r.path}`,
    changeFrequency: r.changeFrequency,
    priority: r.priority,
  }));

  const productEntries: MetadataRoute.Sitemap = products.map((p) => ({
    url: `${SITE_URL}/store/${p.slug}`,
    lastModified: p.updated_at,
    changeFrequency: 'weekly',
    priority: 0.7,
  }));

  const tournamentEntries: MetadataRoute.Sitemap = tournaments.map((t) => ({
    url: `${SITE_URL}/tournaments/${t.id}`,
    lastModified: t.updated_at,
    changeFrequency: 'weekly',
    priority: 0.6,
  }));

  return [...staticEntries, ...productEntries, ...tournamentEntries];
}
