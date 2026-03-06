'use client';

import { useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { X, Megaphone } from 'lucide-react';
import type { Announcement } from '@/lib/types';

export function AnnouncementBanner({
  announcement,
}: {
  announcement: Announcement;
}) {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) return null;

  return (
    <AnimatePresence>
      <motion.div
        initial={{ opacity: 0, y: -10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: -10 }}
        className="gold-gradient"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Megaphone className="w-4 h-4 text-black shrink-0" />
            <p className="text-sm font-medium text-black truncate">
              {announcement.content}
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-full hover:bg-black/10 transition-colors shrink-0"
          >
            <X className="w-3.5 h-3.5 text-black" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
