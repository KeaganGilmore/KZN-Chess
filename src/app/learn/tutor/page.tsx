import { redirect } from 'next/navigation';
import { getTutor } from '@/lib/tutor/access';
import { PageTransition } from '@/components/ui/page-transition';
import { TutorDashboard } from '@/components/tutor/tutor-dashboard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Tutor toolkit - KZN Chess' };

export default async function TutorPage() {
  const tutor = await getTutor();
  if (!tutor) redirect('/auth');

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Tutor <span className="text-primary">Toolkit</span>
        </h1>
        <p className="text-muted-foreground">
          Curate puzzle sets for lessons, keep student records, and log sessions —
          built for offline / over-the-board coaching.
        </p>
        <TutorDashboard />
      </div>
    </PageTransition>
  );
}
