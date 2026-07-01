import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { PageTransition } from '@/components/ui/page-transition';
import { OpeningQuiz } from '@/components/openings/opening-quiz';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Quiz - KZN Chess' };

export default async function QuizPage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth');

  const supabase = createServerClient();
  const { data: rep } = await supabase
    .from('repertoires')
    .select('id, name, color')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!rep) notFound();

  return (
    <PageTransition>
      <div className="md:max-w-5xl md:mx-auto md:px-6 py-3 md:py-6">
        <div className="px-3 md:px-0">
          <Link
            href="/learn/openings/quiz"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-2"
          >
            <ArrowLeft className="w-4 h-4" /> Quiz
          </Link>
          <h1 className="text-xl font-bold mb-3">{rep.name} — review</h1>
        </div>
        <OpeningQuiz repertoire={rep as { id: string; name: string; color: 'white' | 'black' }} />
      </div>
    </PageTransition>
  );
}
