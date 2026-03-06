import { createServerClient } from '@/lib/supabase/server';
import { TournamentBrowser } from '@/components/tournaments/tournament-browser';
import { PageTransition } from '@/components/ui/page-transition';
import type { Tournament, District } from '@/lib/types';

export const revalidate = 0;

export const metadata = {
  title: 'Tournaments - KZN Chess',
  description: 'Browse all chess tournaments across KwaZulu-Natal.',
};

async function getData() {
  try {
    const supabase = createServerClient();

    const [tournamentsRes, districtsRes] = await Promise.all([
      supabase
        .from('tournaments')
        .select('*, district:districts(*)')
        .in('status', ['approved', 'featured'])
        .order('date', { ascending: true }),
      supabase.from('districts').select('*').eq('is_active', true).order('name'),
    ]);

    return {
      tournaments: (tournamentsRes.data || []) as Tournament[],
      districts: (districtsRes.data || []) as District[],
    };
  } catch {
    return { tournaments: [], districts: [] };
  }
}

export default async function TournamentsPage() {
  const { tournaments, districts } = await getData();

  return (
    <PageTransition>
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Tournaments</h1>
          <p className="text-muted-foreground mt-2">
            Find chess events across KwaZulu-Natal
          </p>
        </div>
        <TournamentBrowser tournaments={tournaments} districts={districts} />
      </div>
    </PageTransition>
  );
}
