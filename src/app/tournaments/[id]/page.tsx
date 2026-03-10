import { createServerClient } from '@/lib/supabase/server';
import { notFound } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { TournamentPageTabs } from '@/components/tournaments/tournament-page-tabs';
import { PageTransition } from '@/components/ui/page-transition';
import type { Tournament } from '@/lib/types';

export const revalidate = 0;

export async function generateMetadata({ params }: { params: { id: string } }) {
  const supabase = createServerClient();
  const { data } = await supabase
    .from('tournaments')
    .select('name, venue, date')
    .eq('id', params.id)
    .single();

  if (!data) return { title: 'Tournament - KZN Chess' };

  return {
    title: `${data.name} - KZN Chess`,
    description: `${data.name} at ${data.venue} on ${data.date}`,
  };
}

async function getData(id: string) {
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
    </PageTransition>
  );
}
