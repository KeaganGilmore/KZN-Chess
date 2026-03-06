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
    <section className="py-20 border-t border-white/5">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
          {items.map((item, i) => (
            <motion.div
              key={item.label}
              initial={{ opacity: 0, y: 30 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true }}
              transition={{ duration: 0.5, delay: i * 0.15 }}
              className="text-center p-8 rounded-2xl glass glass-hover"
            >
              <div className="inline-flex items-center justify-center w-12 h-12 rounded-xl bg-primary/10 mb-4">
                <item.icon className="w-6 h-6 text-primary" />
              </div>
              <div className="text-4xl font-bold mb-2">
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
