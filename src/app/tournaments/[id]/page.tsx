import { cache } from 'react';
import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { TournamentPageTabs } from '@/components/tournaments/tournament-page-tabs';
import { PageTransition } from '@/components/ui/page-transition';
import { AdUnit } from '@/components/ads/ad-unit';
import type { Tournament } from '@/lib/types';

export const revalidate = 0;

// cache() dedupes between generateMetadata and the page render within one request
const getData = cache(async (id: string) => {
  const supabase = createServerClient();

  const { data: tournament } = await supabase
    .from('tournaments')
    .select('*, district:districts(*), organizer:users(id, name, email)')
    .eq('id', id)
    .in('status', ['approved', 'featured', 'pending'])
    .single();

  if (!tournament) return null;

  const { data: related } = await supabase
    .from('tournaments')
    .select('*, district:districts(*)')
    .eq('district_id', tournament.district_id)
    .neq('id', id)
    .in('status', ['approved', 'featured', 'pending'])
    .gte('date', new Date().toISOString().split('T')[0])
    .order('date', { ascending: true })
    .limit(3);

  return {
    tournament: tournament as Tournament,
    related: (related || []) as Tournament[],
  };
});

export async function generateMetadata({ params }: { params: { id: string } }) {
  const data = await getData(params.id);
  if (!data) return { title: 'Tournament - KZN Chess' };

  const { tournament } = data;
  return {
    title: `${tournament.name} - KZN Chess`,
    description: `${tournament.name} at ${tournament.venue} on ${tournament.date}`,
  };
}

async function checkManageAccess(tournamentId: string, userId: string): Promise<boolean> {
  const supabase = createServerClient();

  // Check tournament_arbiters
  const { data: arbiter } = await supabase
    .from('tournament_arbiters')
    .select('id')
    .eq('tournament_id', tournamentId)
    .eq('user_id', userId)
    .single();

  return !!arbiter;
}

export default async function TournamentPage({
  params,
}: {
  params: { id: string };
}) {
  const [data, user] = await Promise.all([
    getData(params.id),
    getCurrentUser(),
  ]);
  if (!data) notFound();

  const isAdmin = user?.role === 'admin';
  const isOrganizer = user?.id === data.tournament.organizer_id;
  const canEdit = isAdmin || isOrganizer;

  let canManage = isAdmin || isOrganizer;
  if (user && !canManage) {
    canManage = await checkManageAccess(params.id, user.id);
  }

  return (
    <PageTransition>
      <TournamentPageTabs
        tournament={data.tournament}
        related={data.related}
        canEdit={canEdit}
        canManage={canManage}
      />
      <AdUnit
        slot="TOURNAMENT_DETAIL"
        format="horizontal"
        className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-6"
      />
    </PageTransition>
  );
}
