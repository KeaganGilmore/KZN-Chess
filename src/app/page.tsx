import { createServerClient } from '@/lib/supabase/server';
import { HeroSection } from '@/components/home/hero-section';
import { StatsSection } from '@/components/home/stats-section';
import { UpcomingTournaments } from '@/components/home/upcoming-tournaments';
import { LearnCta } from '@/components/home/learn-cta';
import { AnnouncementBanner } from '@/components/home/announcement-banner';
import { AdUnit } from '@/components/ads/ad-unit';
import type { Tournament, SiteContent, Announcement } from '@/lib/types';

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
  const { tournaments, content, announcement, stats } = await getData();

  return (
    <>
      {announcement && <AnnouncementBanner announcement={announcement} />}
      <HeroSection content={content.hero} />
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
