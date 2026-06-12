import { createServerClient } from '@/lib/supabase/server';
import { PageTransition } from '@/components/ui/page-transition';
import { GalleryBrowser } from '@/components/gallery/gallery-browser';
import type { Tournament } from '@/lib/types';

export const revalidate = 300;

export const metadata = {
  title: 'Gallery - KZN Chess',
  description: 'Photo gallery of past chess tournaments across KwaZulu-Natal.',
};

async function getData() {
  try {
    const supabase = createServerClient();
    const today = new Date().toISOString().split('T')[0];

    // Fetch completed tournaments (past end_date or date) that are approved/featured
    const { data: tournaments } = await supabase
      .from('tournaments')
      .select('*, district:districts(*), media:tournament_media(count)')
      .in('status', ['approved', 'featured'])
      .lt('date', today)
      .order('date', { ascending: false });

    // Fetch all media with tournament info
    const { data: media } = await supabase
      .from('tournament_media')
      .select('*, tournament:tournaments(id, name, date, status, district:districts(name)), uploader:users(id, name)')
      .order('created_at', { ascending: false })
      .limit(50);

    return {
      tournaments: (tournaments || []) as any[],
      media: media || [],
    };
  } catch {
    return { tournaments: [], media: [] };
  }
}

export default async function GalleryPage() {
  const { tournaments, media } = await getData();

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">
            <span className="text-primary">Ama</span>tournament Gallery
          </h1>
          <p className="text-muted-foreground mt-2">
            Relive the moments from chess tournaments across KwaZulu-Natal
          </p>
        </div>
        <GalleryBrowser tournaments={tournaments} media={media} />
      </div>
    </PageTransition>
  );
}
