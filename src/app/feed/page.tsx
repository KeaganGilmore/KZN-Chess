import { createServerClient } from '@/lib/supabase/server';
import { PageTransition } from '@/components/ui/page-transition';
import { FeedView } from '@/components/feed/feed-view';

export const revalidate = 0;

export const metadata = {
  title: 'Feed - KZN Chess',
  description: 'Latest photos and updates from the KZN chess community.',
};

async function getData() {
  try {
    const supabase = createServerClient();

    // Feed algorithm: mix of recent media, recent comments (activity), and tournaments
    // Weighted toward endorsed tournaments, recent activity, and media count
    const [mediaRes, tournamentsRes] = await Promise.all([
      supabase
        .from('tournament_media')
        .select('*, tournament:tournaments(id, name, date, venue, status, is_verified, district:districts(name)), uploader:users(id, name)')
        .order('created_at', { ascending: false })
        .limit(30),
      supabase
        .from('tournaments')
        .select('*, district:districts(*)')
        .in('status', ['approved', 'featured'])
        .order('date', { ascending: false })
        .limit(20),
    ]);

    // Score and sort the feed items
    const feedItems: any[] = [];

    // Add media items
    (mediaRes.data || []).forEach((m: any) => {
      const isEndorsed = m.tournament?.status === 'featured' || m.tournament?.is_verified;
      feedItems.push({
        type: 'media',
        data: m,
        score: isEndorsed ? 10 : 5,
        date: m.created_at,
      });
    });

    // Add tournament items (those with posters or endorsed)
    (tournamentsRes.data || []).forEach((t: any) => {
      const isEndorsed = t.status === 'featured' || t.is_verified;
      if (t.poster_url || isEndorsed) {
        feedItems.push({
          type: 'tournament',
          data: t,
          score: isEndorsed ? 15 : 3,
          date: t.created_at,
        });
      }
    });

    // Sort by score + recency
    feedItems.sort((a, b) => {
      const scoreWeight = (b.score - a.score) * 86400000; // score * 1 day in ms
      const timeWeight = new Date(b.date).getTime() - new Date(a.date).getTime();
      return scoreWeight + timeWeight;
    });

    return { feedItems };
  } catch {
    return { feedItems: [] };
  }
}

export default async function FeedPage() {
  const { feedItems } = await getData();

  return (
    <PageTransition>
      <div className="max-w-2xl mx-auto px-4 sm:px-6 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-primary">Indaba</span> Feed
          </h1>
          <p className="text-muted-foreground mt-2">
            The pulse of KZN chess — photos, events, and community updates
          </p>
        </div>
        <FeedView items={feedItems} />
      </div>
    </PageTransition>
  );
}
