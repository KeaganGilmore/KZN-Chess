import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { redirect } from 'next/navigation';
import { SubmitTournamentForm } from '@/components/tournaments/submit-form';
import { PageTransition } from '@/components/ui/page-transition';
import type { District } from '@/lib/types';

export const metadata = {
  title: 'Submit Tournament - KZN Chess',
  description: 'Submit a new chess tournament to KZN Chess.',
};

export default async function SubmitPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth');
  if (!['organizer', 'admin'].includes(user.role)) {
    redirect('/');
  }

  const supabase = createServerClient();
  const { data: districts } = await supabase
    .from('districts')
    .select('*')
    .eq('is_active', true)
    .order('name');

  return (
    <PageTransition>
      <div className="max-w-3xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="mb-8">
          <h1 className="text-3xl font-bold">Submit Tournament</h1>
          <p className="text-muted-foreground mt-2">
            Fill in the details below to submit a new tournament for approval.
          </p>
        </div>
        <SubmitTournamentForm
          districts={(districts || []) as District[]}
          userId={user.id}
        />
      </div>
    </PageTransition>
  );
}
