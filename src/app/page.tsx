import { createServerClient } from '@/lib/supabase/server';
import { HeroSection } from '@/components/home/hero-section';
import { StatsSection } from '@/components/home/stats-section';
import { UpcomingTournaments } from '@/components/home/upcoming-tournaments';
import { AnnouncementBanner } from '@/components/home/announcement-banner';
import { AdUnit } from '@/components/ads/ad-unit';
import type { Tournament, SiteContent, Announcement } from '@/lib/types';

export const revalidate = 0;

async function getData() {
  try {
    const supabase = createServerClient();

    const [tournamentsRes, contentRes, announcementsRes] = await Promise.all([
      supabase
        .from('tournaments')
        .select('*, district:districts(*)')
        .in('status', ['approved', 'featured'])
        .gte('date', new Date().toISOString().split('T')[0])
        .order('date', { ascending: true })
        .limit(5),
      supabase.from('site_content').select('*'),
      supabase
        .from('announcements')
        .select('*')
        .eq('is_active', true)
        .order('created_at', { ascending: false })
        .limit(1),
    ]);

    const contentMap: Record<string, any> = {};
    (contentRes.data || []).forEach((item: SiteContent) => {
      contentMap[item.key] = item.value;
    });

    return {
      tournaments: (tournamentsRes.data || []) as Tournament[],
      content: contentMap,
      announcement: (announcementsRes.data?.[0] || null) as Announcement | null,
    };
  } catch {
    return { tournaments: [], content: {}, announcement: null };
  }
}

export default async function HomePage() {
  const { tournaments, content, announcement } = await getData();

  return (
    <>
      {announcement && <AnnouncementBanner announcement={announcement} />}
      <HeroSection content={content.hero} />
      <StatsSection stats={content.stats} />
      <AdUnit
        slot="HOME_BANNER"
        format="horizontal"
        className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
      />
      <UpcomingTournaments tournaments={tournaments} />
    </>
  );
}
