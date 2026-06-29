import { redirect, notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { createServerClient } from '@/lib/supabase/server';
import { PageTransition } from '@/components/ui/page-transition';
import { Badge } from '@/components/ui/badge';
import { RepertoireBuilder } from '@/components/openings/repertoire-builder';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Repertoire - KZN Chess' };

export default async function RepertoirePage({ params }: { params: { id: string } }) {
  const user = await getCurrentUser();
  if (!user) redirect('/auth');

  const supabase = createServerClient();
  const { data: repertoire } = await supabase
    .from('repertoires')
    .select('*')
    .eq('id', params.id)
    .eq('user_id', user.id)
    .maybeSingle();
  if (!repertoire) notFound();

  const { data: nodes } = await supabase
    .from('repertoire_nodes')
    .select('id, parent_id, fen, move_san, move_uci, notes, tags')
    .eq('repertoire_id', params.id)
    .order('created_at');

  return (
    <PageTransition>
      <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <Link
          href="/learn/openings"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
        >
          <ArrowLeft className="w-4 h-4" /> Repertoires
        </Link>
        <h1 className="text-2xl font-bold mb-6 flex items-center gap-3">
          {repertoire.name}
          <Badge variant="outline" className="capitalize">{repertoire.color}</Badge>
        </h1>
        <RepertoireBuilder repertoire={repertoire} initialNodes={nodes || []} />
      </div>
    </PageTransition>
  );
}
