import { createServerClient } from '@/lib/supabase/server';
import { HeroSection } from '@/components/home/hero-section';
import { StatsSection } from '@/components/home/stats-section';
import { UpcomingTournaments } from '@/components/home/upcoming-tournaments';
import { LearnCta } from '@/components/home/learn-cta';
import { AnnouncementBanner } from '@/components/home/announcement-banner';
import { AdUnit } from '@/components/ads/ad-unit';
import { StoreHero } from '@/components/home/store-hero';
import { FeaturedProducts } from '@/components/home/featured-products';
import { CategoryStrip } from '@/components/home/category-strip';
import type { Tournament, SiteContent, Announcement } from '@/lib/types';
import type { Product, StoreCategory, StoreSettings } from '@/lib/store/types';
import {
  DEFAULT_SETTINGS,
  countActiveProducts,
  getStoreSettings,
  listCategories,
  listProducts,
} from '@/lib/store/catalog';

// Serve cached pages for 60s; tournament/content changes appear within a minute
export const revalidate = 60;

// Homepage stats are computed live from the database — never hardcoded.
// Definitions (adjust here if the product meaning changes):
//   districts          = active districts on the platform
//   tournaments_hosted = publicly listed events (approved or featured)
//   players_registered = active accounts with the 'player' role
interface SiteStats {
  districts: number;
  tournaments_hosted: number;
  players_registered: number;
}

const EMPTY_STATS: SiteStats = {
  districts: 0,
  tournaments_hosted: 0,
  players_registered: 0,
};

interface StoreData {
  settings: StoreSettings;
  featured: Product[];
  /** true when no product is flagged featured and `featured` holds the newest ones instead */
  featuredFallback: boolean;
  categories: StoreCategory[];
  productCount: number;
}

const EMPTY_STORE: StoreData = {
  settings: DEFAULT_SETTINGS,
  featured: [],
  featuredFallback: false,
  categories: [],
  productCount: 0,
};

// Store-first homepage data. Isolated from the tournament data so a store
// failure (or the store migration not being applied yet) never breaks the
// page — it simply falls back to the tournament hero.
async function getStoreData(): Promise<StoreData> {
  try {
    const settings = await getStoreSettings();
    if (!settings.store_enabled) return { ...EMPTY_STORE, settings };
    const [featuredOnly, categories, productCount] = await Promise.all([
      listProducts({ featured: true, limit: 8 }),
      listCategories(),
      countActiveProducts(),
    ]);
    // Nothing flagged as featured yet: show the newest products instead of an empty section.
    const featuredFallback = featuredOnly.length === 0;
    const featured = featuredFallback ? await listProducts({ limit: 8 }) : featuredOnly;
    return { settings, featured, featuredFallback, categories, productCount };
  } catch (err) {
    console.error('Home page getStoreData failed:', err);
    return EMPTY_STORE;
  }
}

async function getData() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];
    const nowIso = new Date().toISOString();

    const [
      tournamentsRes,
      contentRes,
      announcementsRes,
      districtsCount,
      hostedCount,
      playersCount,
    ] = await Promise.all([
      supabase
        .from('tournaments')
        .select('*, district:districts(*)')
        .in('status', ['approved', 'featured'])
        .gte('date', today)
        .order('date', { ascending: true })
        .limit(5),
      supabase.from('site_content').select('*'),
      supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .or(`end_date.is.null,end_date.gt.${nowIso}`)
        .lte('start_date', nowIso)
        .order('created_at', { ascending: false })
        .limit(1),
      supabase
        .from('districts')
        .select('id', { count: 'exact', head: true })
        .eq('is_active', true),
      supabase
        .from('tournaments')
        .select('id', { count: 'exact', head: true })
        .in('status', ['approved', 'featured']),
      supabase
        .from('users')
        .select('id', { count: 'exact', head: true })
        .eq('role', 'player')
        .eq('is_active', true),
    ]);

    const contentMap: Record<string, any> = {};
    (contentRes.data || []).forEach((item: SiteContent) => {
      contentMap[item.key] = item.value;
    });

    return {
      tournaments: (tournamentsRes.data || []) as Tournament[],
      content: contentMap,
      announcement: (announcementsRes.data?.[0] || null) as Announcement | null,
      stats: {
        districts: districtsCount.count ?? 0,
        tournaments_hosted: hostedCount.count ?? 0,
        players_registered: playersCount.count ?? 0,
      } as SiteStats,
    };
  } catch (err) {
    console.error('Home page getData failed:', err);
    return { tournaments: [], content: {}, announcement: null, stats: EMPTY_STATS };
  }
}

export default async function HomePage() {
  const [{ tournaments, content, announcement, stats }, store] = await Promise.all([
    getData(),
    getStoreData(),
  ]);
  const storeFirst = store.settings.store_enabled;

  return (
    <>
      {announcement && <AnnouncementBanner announcement={announcement} />}
      {storeFirst ? (
        <>
          <StoreHero
            storeName={store.settings.store_name}
            tagline={store.settings.tagline}
            productCount={store.productCount}
            deliveryEnabled={store.settings.delivery_enabled}
            collectionEnabled={store.settings.collection_enabled}
          />
          <FeaturedProducts products={store.featured} fallback={store.featuredFallback} />
          <CategoryStrip categories={store.categories} />
        </>
      ) : (
        <HeroSection content={content.hero} />
      )}
      <StatsSection stats={stats} />
      <AdUnit
        slot="HOME_BANNER"
        format="horizontal"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
      />
      <UpcomingTournaments tournaments={tournaments} />
      <LearnCta />
    </>
  );
}
