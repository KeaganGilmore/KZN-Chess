'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
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
        className="bg-primary"
      >
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-2.5 flex items-center justify-between gap-4">
          <div className="flex items-center gap-2 min-w-0">
            <Megaphone className="w-4 h-4 text-primary-foreground shrink-0" />
            <p className="text-sm font-medium text-primary-foreground truncate">
              {announcement.content}
            </p>
          </div>
          <button
            onClick={() => setDismissed(true)}
            className="p-1 rounded-full hover:bg-primary-foreground/10 transition-colors shrink-0 min-w-[44px] min-h-[44px] flex items-center justify-center"
          >
            <X className="w-3.5 h-3.5 text-primary-foreground" />
          </button>
        </div>
      </motion.div>
    </AnimatePresence>
  );
}
