import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect, notFound } from 'next/navigation';
import { SubmitTournamentForm } from '@/components/tournaments/submit-form';
import { PageTransition } from '@/components/ui/page-transition';
import type { District, Tournament } from '@/lib/types';

export const metadata = {
  title: 'Edit Tournament - KZN Chess',
  description: 'Edit your tournament details.',
};

export default async function EditTournamentPage({
  params,
}: {
  params: { id: string };
}) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth');

  const supabase = createServerClient();

  const [{ data: tournament }, { data: districts }] = await Promise.all([
    supabase
      .from('tournaments')
      .select('*, district:districts(*)')
      .eq('id', params.id)
      .single(),
    supabase.from('districts').select('*').eq('is_active', true).order('name'),
  ]);

  if (!tournament) notFound();

  // Only the owner or an admin can edit
  const isAdmin = user.role === 'admin';
  const isOwner = tournament.organizer_id === user.id;
  if (!isAdmin && !isOwner) redirect(`/tournaments/${params.id}`);

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Edit Tournament</h1>
          <p className="text-muted-foreground mt-2">
            Update the details for your tournament.
          </p>
        </div>
        <SubmitTournamentForm
          districts={(districts || []) as District[]}
          userId={user.id}
          tournament={tournament as Tournament}
        />
      </div>
    </PageTransition>
  );
}
