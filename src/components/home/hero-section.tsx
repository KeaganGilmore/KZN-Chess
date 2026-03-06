'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { Search, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface HeroContent {
  title?: string;
  subtitle?: string;
  description?: string;
}

export function HeroSection({ content }: { content?: HeroContent }) {
  const subtitle = content?.subtitle || 'Every Tournament, One Place';
  const description =
    content?.description ||
    'The central hub for all chess tournaments across KwaZulu-Natal. Find events, register, and grow the chess community.';

  return (
    <section className="relative overflow-hidden pattern-shield gradient-kzn-sunset">
      {/* Decorative beadwork-inspired top border */}
      <div className="h-1 bg-gradient-to-r from-[var(--ochre)] via-[var(--teal)] to-[var(--deep-red)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          {/* Text content */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-6">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Indaba yama-Tournament
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              <span className="text-primary">KwaZulu-Natal</span>
              <br />
              <span className="text-foreground">{subtitle}</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              {description}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/tournaments">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground font-semibold text-base px-6 hover:bg-primary/90 w-full sm:w-auto min-h-[44px]"
                >
                  <Search className="w-4 h-4 mr-2" />
                  Browse Tournaments
                </Button>
              </Link>
              <Link href="/feed">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-6 border-border hover:bg-secondary w-full sm:w-auto min-h-[44px]"
                >
                  Indaba Feed
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Chess knight in Zulu shield motif */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative">
              {/* Outer diamond - isihlangu shield shape */}
              <div className="w-80 h-80 border border-primary/10 rotate-45 rounded-3xl relative">
                <div className="absolute inset-4 border border-primary/8 rounded-2xl" />
                <div className="absolute inset-8 bg-primary/[0.03] border border-primary/6 rounded-xl" />
              </div>
              {/* Inner decorative diamonds */}
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-primary/20" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-primary/20" />
              <div className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-teal-accent/20" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-teal-accent/20" />
              {/* Official logo centered */}
              <div className="absolute inset-0 flex items-center justify-center">
                <Image
                  src="/favicon.png"
                  alt="KZN Chess"
                  width={120}
                  height={120}
                  className="opacity-90"
                />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      {/* Beadwork-inspired bottom divider */}
      <div className="divider-zulu" />
    </section>
  );
}
