import Link from 'next/link';
import { Puzzle, BookOpen, Brain, GraduationCap } from 'lucide-react';
import { getCurrentUser } from '@/lib/auth';
import { PageTransition } from '@/components/ui/page-transition';
import { Card, CardContent } from '@/components/ui/card';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Learn - KZN Chess' };

const sections = [
  {
    href: '/learn/puzzles',
    icon: Puzzle,
    title: 'Puzzles',
    desc: 'Train tactics with rated puzzles. Your rating adapts as you solve, with hints, streaks and progress.',
  },
  {
    href: '/learn/openings',
    icon: BookOpen,
    title: 'Opening Repertoires',
    desc: 'Build your opening lines as a move tree, annotate and tag positions, and import PGNs.',
  },
  {
    href: '/learn/openings/quiz',
    icon: Brain,
    title: 'Opening Quiz',
    desc: 'Drill your repertoires with spaced repetition — the lines you miss come back sooner.',
  },
];

export default async function LearnPage() {
  const user = await getCurrentUser();
  const isTutor = !!user && (user.is_tutor || user.role === 'admin');

  return (
    <PageTransition>
      <div className="max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 py-10">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2">
          Learn <span className="text-primary">Chess</span>
        </h1>
        <p className="text-muted-foreground mb-8">
          Tactics training, opening preparation, and coaching tools.
        </p>

        <div className="grid sm:grid-cols-2 gap-4">
          {sections.map((s) => (
            <Link key={s.href} href={s.href}>
              <Card className="h-full hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="inline-flex w-11 h-11 rounded-xl bg-primary/10 items-center justify-center mb-3">
                    <s.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="font-heading font-semibold text-lg mb-1">{s.title}</h2>
                  <p className="text-sm text-muted-foreground">{s.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}

          {isTutor && (
            <Link href="/learn/tutor">
              <Card className="h-full border-primary/30 hover:border-primary/50 transition-colors">
                <CardContent className="p-6">
                  <div className="inline-flex w-11 h-11 rounded-xl bg-primary/10 items-center justify-center mb-3">
                    <GraduationCap className="w-5 h-5 text-primary" />
                  </div>
                  <h2 className="font-heading font-semibold text-lg mb-1">Tutor Toolkit</h2>
                  <p className="text-sm text-muted-foreground">
                    Curate puzzle sets, keep student records, log sessions, and print
                    sets for over-the-board coaching.
                  </p>
                </CardContent>
              </Card>
            </Link>
          )}
        </div>
      </div>
    </PageTransition>
  );
}
