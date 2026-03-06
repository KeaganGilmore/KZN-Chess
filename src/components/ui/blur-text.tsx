'use client';

import { motion, useInView } from 'framer-motion';
import { useRef } from 'react';
import { cn } from '@/lib/utils';

export function BlurText({
  text,
  className,
  delay = 0,
}: {
  text: string;
  className?: string;
  delay?: number;
}) {
  const ref = useRef(null);
  const isInView = useInView(ref, { once: true });

  const words = text.split(' ');

  return (
    <span ref={ref} className={cn('inline-flex flex-wrap', className)}>
      {words.map((word, i) => (
        <motion.span
          key={i}
          className="inline-block mr-[0.25em]"
          initial={{ opacity: 0, filter: 'blur(10px)', y: 10 }}
          animate={
            isInView
              ? { opacity: 1, filter: 'blur(0px)', y: 0 }
              : {}
          }
          transition={{
            duration: 0.4,
            delay: delay + i * 0.08,
            ease: 'easeOut',
          }}
        >
          {word}
        </motion.span>
      ))}
    </span>
  );
}
