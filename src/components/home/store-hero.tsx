'use client';

import Link from 'next/link';
import Image from 'next/image';
import { motion } from 'framer-motion';
import { ShoppingBag, Trophy, ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface StoreHeroProps {
  storeName: string;
  tagline: string | null;
  productCount: number;
  deliveryEnabled: boolean;
  collectionEnabled: boolean;
}

/**
 * Store-first homepage hero. Copy comes from store settings (admin-managed);
 * the product count is computed live. Mirrors the tournament hero's KZN
 * styling so the site still reads as one place.
 */
export function StoreHero({
  storeName,
  tagline,
  productCount,
  deliveryEnabled,
  collectionEnabled,
}: StoreHeroProps) {
  const line2 = tagline || 'Boards, sets, clocks and more for KZN players';
  const fulfilment =
    deliveryEnabled && collectionEnabled
      ? 'Delivered to your door, or collected free at a tournament near you.'
      : deliveryEnabled
        ? 'Delivered to your door anywhere in KwaZulu-Natal.'
        : collectionEnabled
          ? 'Collect free at a tournament or venue near you.'
          : '';

  return (
    <section className="relative overflow-hidden pattern-shield gradient-kzn-sunset">
      {/* Decorative beadwork-inspired top border */}
      <div className="h-1 bg-gradient-to-r from-[var(--ochre)] via-[var(--teal)] to-[var(--deep-red)]" />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-16 sm:py-24">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10 items-center">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
          >
            <div className="inline-flex items-center gap-2 px-3 py-1.5 rounded-full bg-primary/10 border border-primary/20 text-xs font-medium text-primary mb-6">
              <ShoppingBag className="w-3.5 h-3.5" />
              Official store
              {productCount > 0 && (
                <span className="text-muted-foreground">
                  · {productCount} product{productCount === 1 ? '' : 's'}
                </span>
              )}
            </div>

            <h1 className="font-heading text-3xl sm:text-4xl lg:text-5xl font-bold tracking-tight mb-4">
              <span className="text-primary">{storeName}</span>
              <br />
              <span className="text-foreground">{line2}</span>
            </h1>

            <p className="text-base sm:text-lg text-muted-foreground max-w-lg mb-8 leading-relaxed">
              Every purchase supports chess in KwaZulu-Natal.{fulfilment ? ` ${fulfilment}` : ''}
            </p>

            <div className="flex flex-col sm:flex-row gap-3">
              <Link href="/store">
                <Button
                  size="lg"
                  className="bg-primary text-primary-foreground font-semibold text-base px-6 hover:bg-primary/90 w-full sm:w-auto min-h-[44px]"
                >
                  <ShoppingBag className="w-4 h-4 mr-2" />
                  Shop now
                </Button>
              </Link>
              <Link href="/tournaments">
                <Button
                  variant="outline"
                  size="lg"
                  className="text-base px-6 border-border hover:bg-secondary w-full sm:w-auto min-h-[44px]"
                >
                  <Trophy className="w-4 h-4 mr-2" />
                  Tournaments
                  <ArrowRight className="w-4 h-4 ml-2" />
                </Button>
              </Link>
            </div>
          </motion.div>

          {/* Zulu shield motif with the logo (same device as the tournament hero) */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="hidden lg:flex items-center justify-center"
          >
            <div className="relative">
              <div className="w-80 h-80 border border-primary/10 rotate-45 rounded-3xl relative">
                <div className="absolute inset-4 border border-primary/10 rounded-2xl" />
                <div className="absolute inset-8 bg-primary/[0.03] border border-primary/5 rounded-xl" />
              </div>
              <div className="absolute top-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-primary/20" />
              <div className="absolute bottom-2 left-1/2 -translate-x-1/2 w-3 h-3 rotate-45 bg-primary/20" />
              <div className="absolute left-2 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-[var(--teal)] opacity-20" />
              <div className="absolute right-2 top-1/2 -translate-y-1/2 w-3 h-3 rotate-45 bg-[var(--teal)] opacity-20" />
              <div className="absolute inset-0 flex items-center justify-center">
                <Image src="/favicon.png" alt="KZN Chess" width={120} height={120} className="opacity-90" />
              </div>
            </div>
          </motion.div>
        </div>
      </div>

      <div className="divider-zulu" />
    </section>
  );
}
