import Link from 'next/link';
import { redirect } from 'next/navigation';
import { format } from 'date-fns';
import { Trophy, Plus, Pencil, ShieldCheck, Gavel } from 'lucide-react';
import { createServerClient } from '@/lib/supabase/server';
import { getCurrentUser } from '@/lib/auth';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';

export const metadata = {
  title: 'My Tournaments - KZN Chess',
  description: 'Tournaments you organize or arbitrate.',
};

const statusStyles: Record<string, string> = {
  pending: 'bg-orange-500/10 text-orange-400 border-orange-500/20',
  approved: 'bg-green-500/10 text-green-400 border-green-500/20',
  rejected: 'bg-red-500/10 text-red-400 border-red-500/20',
  featured: 'bg-primary/10 text-primary border-primary/20',
};

const statusHelp: Record<string, string> = {
  pending: 'Awaiting admin review — only you can see it',
  approved: 'Live and visible to everyone',
  rejected: 'Not approved — contact the admin team',
  featured: 'Featured on the platform',
};

async function getData(userId: string) {
  const supabase = createServerClient();

  const [ownRes, arbiterRes] = await Promise.all([
    supabase
      .from('tournaments')
      .select('*, district:districts(name)')
      .eq('organizer_id', userId)
      .order('date', { ascending: false }),
    supabase
      .from('tournament_arbiters')
      .select('tournament:tournaments(*, district:districts(name))')
      .eq('user_id', userId),
  ]);

  const own = ownRes.data || [];
  const ownIds = new Set(own.map((t: any) => t.id));
  const arbitrating = (arbiterRes.data || [])
    .map((row: any) => row.tournament)
    .filter((t: any) => t && !ownIds.has(t.id));

  return { own, arbitrating };
}

function TournamentRow({ t, role }: { t: any; role: 'organizer' | 'arbiter' }) {
  return (
    <Card className="hover:border-primary/20 transition-colors">
      <CardContent className="py-4">
        <div className="flex items-center justify-between gap-4 flex-wrap">
          <div className="min-w-0">
            <Link
              href={`/tournaments/${t.id}`}
              className="font-semibold hover:text-primary transition-colors"
            >
              {t.name}
            </Link>
            <p className="text-sm text-muted-foreground mt-0.5">
              {format(new Date(t.date), 'd MMM yyyy')}
              {t.district?.name && ` · ${t.district.name}`}
              {t.venue && ` · ${t.venue}`}
            </p>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            {role === 'arbiter' ? (
              <Badge variant="outline" className="gap-1 bg-blue-500/10 text-blue-400 border-blue-500/20">
                <Gavel className="w-3 h-3" />
                Arbiter
              </Badge>
            ) : (
              <Badge
                variant="outline"
                className={statusStyles[t.status] || ''}
                title={statusHelp[t.status]}
              >
                {t.status}
              </Badge>
            )}
            {t.is_verified && (
              <Badge variant="outline" className="gap-1 border-emerald-500/30 bg-emerald-500/10 text-emerald-400">
                <ShieldCheck className="w-3 h-3" />
                Endorsed
              </Badge>
            )}
            {role === 'organizer' && (
              <Link href={`/tournaments/${t.id}/edit`}>
                <Button variant="outline" size="sm" className="gap-1.5">
                  <Pencil className="w-3.5 h-3.5" />
                  Edit
                </Button>
              </Link>
            )}
          </div>
        </div>
        {role === 'organizer' && t.status !== 'approved' && t.status !== 'featured' && (
          <p className="text-xs text-muted-foreground mt-2">{statusHelp[t.status]}</p>
        )}
      </CardContent>
    </Card>
  );
}

export default async function MyTournamentsPage() {
  const user = await getCurrentUser();
  if (!user) redirect('/auth');

  const { own, arbitrating } = await getData(user.id);

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <div className="flex items-start justify-between gap-4 mb-8 flex-wrap">
          <div>
            <h1 className="text-3xl font-bold flex items-center gap-3">
              <Trophy className="w-7 h-7 text-primary" />
              My Tournaments
            </h1>
            <p className="text-muted-foreground mt-2">
              Tournaments you have submitted or help manage.
            </p>
          </div>
          <Link href="/submit">
            <Button className="gap-2">
              <Plus className="w-4 h-4" />
              Submit Tournament
            </Button>
          </Link>
        </div>

        {own.length === 0 && arbitrating.length === 0 ? (
          <Card>
            <CardContent className="py-16 text-center">
              <Trophy className="w-10 h-10 text-muted-foreground mx-auto mb-4" />
              <p className="font-medium mb-1">No tournaments yet</p>
              <p className="text-sm text-muted-foreground mb-6">
                Submit your first tournament and it will appear here once created.
              </p>
              <Link href="/submit">
                <Button className="gap-2">
                  <Plus className="w-4 h-4" />
                  Submit a Tournament
                </Button>
              </Link>
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {own.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Organizing ({own.length})</h2>
                {own.map((t: any) => (
                  <TournamentRow key={t.id} t={t} role="organizer" />
                ))}
              </div>
            )}
            {arbitrating.length > 0 && (
              <div className="space-y-3">
                <h2 className="text-lg font-semibold">Arbitrating ({arbitrating.length})</h2>
                {arbitrating.map((t: any) => (
                  <TournamentRow key={t.id} t={t} role="arbiter" />
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </PageTransition>
  );
}
