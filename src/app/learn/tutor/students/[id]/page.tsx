import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getTutor } from '@/lib/tutor/access';
import { createServerClient } from '@/lib/supabase/server';
import { PageTransition } from '@/components/ui/page-transition';
import { StudentDetail } from '@/components/tutor/student-detail';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Student - KZN Chess' };

export default async function StudentPage({ params }: { params: { id: string } }) {
  const tutor = await getTutor();
  if (!tutor) redirect('/auth');

  const supabase = createServerClient();
  const { data: student } = await supabase
    .from('students')
    .select('*')
    .eq('id', params.id)
    .eq('tutor_id', tutor.id)
    .maybeSingle();
  if (!student) notFound();

  const { data: logs } = await supabase
    .from('student_session_logs')
    .select('*, set:session_sets(id, name)')
    .eq('student_id', params.id)
    .order('session_date', { ascending: false });
  const { data: sets } = await supabase
    .from('session_sets')
    .select('id, name')
    .eq('tutor_id', tutor.id)
    .order('created_at', { ascending: false });

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/learn/tutor"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Tutor toolkit
        </Link>
        <h1 className="text-2xl font-bold mb-6">{student.name}</h1>
        <StudentDetail student={student} logs={logs || []} sets={sets || []} />
      </div>
    </PageTransition>
  );
}
