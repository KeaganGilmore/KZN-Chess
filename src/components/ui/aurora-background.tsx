'use client';

import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export function AuroraBackground({
  children,
  className,
}: {
  children?: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('relative overflow-hidden', className)}>
      <div className="absolute inset-0 z-0">
        <motion.div
          className="absolute -top-1/2 -left-1/2 w-[200%] h-[200%]"
          style={{
            background:
              'radial-gradient(ellipse at 20% 50%, rgba(180, 130, 40, 0.08) 0%, transparent 50%), radial-gradient(ellipse at 80% 20%, rgba(59, 130, 246, 0.06) 0%, transparent 50%), radial-gradient(ellipse at 50% 80%, rgba(168, 85, 247, 0.04) 0%, transparent 50%)',
          }}
          animate={{
            x: [0, 30, -20, 0],
            y: [0, -30, 20, 0],
          }}
          transition={{
            duration: 20,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
        <motion.div
          className="absolute -top-1/4 -right-1/4 w-[150%] h-[150%]"
          style={{
            background:
              'radial-gradient(ellipse at 60% 40%, rgba(245, 158, 11, 0.06) 0%, transparent 40%), radial-gradient(ellipse at 30% 70%, rgba(99, 102, 241, 0.04) 0%, transparent 40%)',
          }}
          animate={{
            x: [0, -40, 20, 0],
            y: [0, 20, -40, 0],
          }}
          transition={{
            duration: 25,
            repeat: Infinity,
            ease: 'easeInOut',
          }}
        />
      </div>
      {children && <div className="relative z-10">{children}</div>}
    </div>
  );
}
