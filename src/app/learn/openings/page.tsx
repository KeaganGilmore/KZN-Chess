import Link from 'next/link';
import { getCurrentUser } from '@/lib/auth';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent } from '@/components/ui/card';
import { RepertoireList } from '@/components/openings/repertoire-list';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Opening repertoires - KZN Chess' };

export default async function OpeningsPage() {
  const user = await getCurrentUser();

  return (
    <PageTransition>
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Opening <span className="text-primary">Repertoires</span>
        </h1>
        <p className="text-muted-foreground mb-6">
          Build your opening lines as a move tree, annotate positions, tag them,
          and import PGNs.
        </p>
        {user ? (
          <RepertoireList />
        ) : (
          <Card>
            <CardContent className="py-10 text-center space-y-3">
              <p className="font-medium">Sign in to build repertoires.</p>
              <Link href="/auth" className="text-primary hover:underline text-sm">
                Go to sign in →
              </Link>
            </CardContent>
          </Card>
        )}
      </div>
    </PageTransition>
  );
}
