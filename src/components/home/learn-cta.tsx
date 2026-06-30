import Link from 'next/link';
import { Puzzle, BookOpen, Brain, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';

const items = [
  {
    href: '/learn/puzzles',
    icon: Puzzle,
    title: 'Puzzle Trainer',
    desc: 'Millions of rated tactics — your rating adapts as you solve, with hints and streaks.',
  },
  {
    href: '/learn/openings',
    icon: BookOpen,
    title: 'Opening Repertoires',
    desc: 'Build your opening lines as a move tree, annotate positions, and import PGNs.',
  },
  {
    href: '/learn/openings/quiz',
    icon: Brain,
    title: 'Opening Drills',
    desc: 'Spaced-repetition review of your repertoires — the lines you miss come back sooner.',
  },
];

export function LearnCta() {
  return (
    <section className="py-16 sm:py-20 pattern-beadwork relative">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-wrap items-end justify-between gap-4 mb-8">
          <div>
            <h2 className="text-2xl sm:text-3xl font-heading font-bold">
              Train your <span className="text-primary">chess</span>
            </h2>
            <p className="text-muted-foreground mt-1">
              Sharpen tactics and openings between tournaments.
            </p>
          </div>
          <Link href="/learn">
            <Button variant="outline">
              Explore Learn <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </Link>
        </div>

        <div className="grid sm:grid-cols-3 gap-4">
          {items.map((it) => (
            <Link key={it.href} href={it.href}>
              <Card className="h-full hover:border-primary/30 transition-colors">
                <CardContent className="p-6">
                  <div className="inline-flex w-11 h-11 rounded-xl bg-primary/10 items-center justify-center mb-3">
                    <it.icon className="w-5 h-5 text-primary" />
                  </div>
                  <h3 className="font-heading font-semibold mb-1">{it.title}</h3>
                  <p className="text-sm text-muted-foreground">{it.desc}</p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      </div>
    </section>
  );
}
