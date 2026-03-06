'use client';

import Link from 'next/link';
import { motion } from 'framer-motion';
import { ArrowRight, Search } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { AuroraBackground } from '@/components/ui/aurora-background';
import { BlurText } from '@/components/ui/blur-text';

interface HeroContent {
  title?: string;
  subtitle?: string;
  description?: string;
}

export function HeroSection({ content }: { content?: HeroContent }) {
  const title = content?.title || 'KwaZulu-Natal Chess';
  const subtitle = content?.subtitle || 'Every Tournament, One Place';
  const description =
    content?.description ||
    'The central hub for all chess tournaments across KwaZulu-Natal. Find events, register, and grow the chess community.';

  return (
    <AuroraBackground className="min-h-[85vh] flex items-center">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-20">
        <div className="max-w-3xl mx-auto text-center">
          {/* Chess grid pattern */}
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 0.03 }}
            transition={{ duration: 2 }}
            className="absolute inset-0 pointer-events-none"
            style={{
              backgroundImage: `linear-gradient(45deg, currentColor 25%, transparent 25%), linear-gradient(-45deg, currentColor 25%, transparent 25%), linear-gradient(45deg, transparent 75%, currentColor 75%), linear-gradient(-45deg, transparent 75%, currentColor 75%)`,
              backgroundSize: '40px 40px',
              backgroundPosition: '0 0, 0 20px, 20px -20px, -20px 0px',
            }}
          />

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
            className="mb-6"
          >
            <span className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full glass text-xs font-medium text-primary">
              <span className="w-1.5 h-1.5 rounded-full bg-primary animate-pulse" />
              Live Tournament Hub
            </span>
          </motion.div>

          <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold tracking-tight mb-6">
            <BlurText text={title} className="text-gold block" />
            <BlurText
              text={subtitle}
              className="text-foreground block mt-2"
              delay={0.3}
            />
          </h1>

          <motion.p
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 0.8, duration: 0.6 }}
            className="text-lg sm:text-xl text-muted-foreground max-w-2xl mx-auto mb-10 leading-relaxed"
          >
            {description}
          </motion.p>

          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 1, duration: 0.5 }}
            className="flex flex-col sm:flex-row gap-4 justify-center"
          >
            <Link href="/tournaments">
              <Button
                size="lg"
                className="gold-gradient text-black font-semibold text-base px-8 hover:opacity-90 transition-opacity w-full sm:w-auto"
              >
                <Search className="w-4 h-4 mr-2" />
                Browse Tournaments
              </Button>
            </Link>
            <Link href="/about">
              <Button
                variant="outline"
                size="lg"
                className="text-base px-8 border-white/10 hover:bg-white/5 w-full sm:w-auto"
              >
                Learn More
                <ArrowRight className="w-4 h-4 ml-2" />
              </Button>
            </Link>
          </motion.div>
        </div>
      </div>
    </AuroraBackground>
  );
}
