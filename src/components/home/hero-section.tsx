'use client';

import Link from 'next/link';
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
    <section className="relative overflow-hidden pattern-zulu">
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
              Live Tournament Hub
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
              <Link href="/about">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-6 border-border hover:bg-secondary w-full sm:w-auto min-h-[44px]"
                >
                  Learn More
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Chess knight illustration */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative">
              <div className="w-72 h-72 bg-primary/5 border border-primary/10 rotate-45 rounded-3xl" />
              <div className="absolute inset-0 flex items-center justify-center">
                <svg
                  viewBox="0 0 45 45"
                  className="w-40 h-40 text-primary opacity-80"
                  fill="currentColor"
                >
                  <g transform="translate(0,0.5)">
                    <path
                      d="M 22,10 C 32.5,11 38.5,18 38,39 L 15,39 C 15,30 25,32.5 23,18"
                      style={{ fill: 'currentColor', opacity: 0.15 }}
                    />
                    <path
                      d="M 24,18 C 24.38,20.91 18.45,25.37 16,27 C 13,29 13.18,31.34 11,31 C 9.958,30.06 12.41,27.96 11,28 C 10,28 11.19,29.23 10,30 C 9,30 5.997,31 6,26 C 6,24 12,14 12,14 C 12,14 13.89,12.1 14,10.5 C 13.27,9.506 13.5,8.5 13.5,7.5 C 14.5,6.5 16.5,10 16.5,10 L 18.5,10 C 18.5,10 19.28,8.008 21,7 C 22,7 22,10 22,10"
                      style={{ fill: 'currentColor' }}
                    />
                    <path
                      d="M 9.5 25.5 A 0.5 0.5 0 1 1 8.5,25.5 A 0.5 0.5 0 1 1 9.5 25.5 z"
                      style={{ fill: 'hsl(var(--background))' }}
                    />
                    <path
                      d="M 15 15.5 A 0.5 1.5 0 1 1 14,15.5 A 0.5 1.5 0 1 1 15 15.5 z"
                      transform="matrix(0.866,0.5,-0.5,0.866,9.693,-5.173)"
                      style={{ fill: 'hsl(var(--background))' }}
                    />
                  </g>
                </svg>
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="h-0.5 bg-gradient-to-r from-transparent via-primary/40 to-transparent" />
    </section>
  );
}
