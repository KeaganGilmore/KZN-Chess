'use client';

import { motion } from 'framer-motion';
import { Map, Trophy, Users } from 'lucide-react';
import { AnimatedCounter } from '@/components/ui/animated-counter';

interface Stats {
  districts?: number;
  tournaments_hosted?: number;
  players_registered?: number;
}

export function StatsSection({ stats }: { stats?: Stats }) {
  const items = [
    {
      icon: Map,
      value: stats?.districts || 11,
      label: 'Districts',
      suffix: '',
    },
    {
      icon: Trophy,
      value: stats?.tournaments_hosted || 156,
      label: 'Tournaments Hosted',
      suffix: '+',
    },
    {
      icon: Users,
      value: stats?.players_registered || 2400,
      label: 'Players Registered',
      suffix: '+',
    },
  ];

  return (
    <section className="py-16 sm:py-20 pattern-diamonds">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 20 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative text-center p-8"
            >
              {/* Diamond background */}
              <div className="absolute inset-4 bg-card border border-primary/10 rotate-45 rounded-xl -z-10" />

              <div className="inline-flex items-center justify-center w-12 h-12 rounded-lg bg-primary/10 mb-4">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-3xl sm:text-4xl font-heading font-bold mb-1">
                <AnimatedCounter
                  value={item.value}
                  suffix={item.suffix}
                />
              </div>
              <p className="text-sm text-muted-foreground">{item.label}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}
