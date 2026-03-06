'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { TournamentCard } from '@/components/tournaments/tournament-card';
import type { Tournament } from '@/lib/types';

export function UpcomingTournaments({
  tournaments,
}: {
  tournaments: Tournament[];
}) {
  return (
    <section className="py-20 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          className="flex items-end justify-between mb-10"
        >
          <div>
            <h2 className="text-2xl sm:text-3xl font-bold">
              Upcoming Tournaments
            </h2>
            <p className="text-muted-foreground mt-2">
              Find your next event across KwaZulu-Natal
            </p>
          </div>
          <Link href="/tournaments" className="hidden sm:block">
            <Button variant="ghost" className="gap-2 hover:text-primary">
              View All
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </motion.div>

        {tournaments.length > 0 ? (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5">
            {tournaments.map((tournament, i) => (
              <TournamentCard
                key={tournament.id}
                tournament={tournament}
                index={i}
              />
            ))}
          </div>
        ) : (
          <div className="text-center py-16 glass rounded-2xl">
            <p className="text-muted-foreground">
              No upcoming tournaments at the moment. Check back soon!
            </p>
          </div>
        )}

        <div className="mt-8 text-center sm:hidden">
          <Link href="/tournaments">
            <Button variant="outline" className="gap-2">
              View All Tournaments
              <ArrowRight className="w-4 h-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}
