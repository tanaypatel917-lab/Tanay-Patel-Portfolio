'use client';

import { useRef } from 'react';
import { motion, useTransform, type MotionValue } from 'framer-motion';

interface MoneyStackProps {
  progress: MotionValue<number>;
}

const BILLS = 18;

export function MoneyStack({ progress }: MoneyStackProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  return (
    <div
      ref={containerRef}
      className="relative w-full h-full flex items-end justify-center"
      style={{ perspective: '1000px' }}
    >
      <div
        className="relative"
        style={{ transformStyle: 'preserve-3d', transform: 'rotateX(55deg) rotateZ(-15deg)' }}
      >
        {Array.from({ length: BILLS }).map((_, i) => (
          <Bill key={i} index={i} progress={progress} />
        ))}
      </div>
    </div>
  );
}

function Bill({ index, progress }: { index: number; progress: MotionValue<number> }) {
  const baseDelay = index / BILLS;
  const lift = useTransform(
    progress,
    [baseDelay * 0.8, baseDelay * 0.8 + 0.2],
    [0, 1]
  );
  const y = useTransform(lift, [0, 1], [0, -index * 14]);
  const opacity = useTransform(lift, [0, 0.8], [0, 1]);

  return (
    <motion.div
      style={{ y, opacity }}
      className="absolute left-1/2 top-0 -translate-x-1/2 w-40 md:w-56 h-20 md:h-28 rounded-lg border border-emerald-500/30 bg-gradient-to-br from-emerald-950/90 to-background shadow-2xl"
    >
      <div className="absolute inset-0 flex items-center justify-center">
        <span className="text-emerald-400/40 font-display text-2xl md:text-3xl font-bold tracking-widest">
          TP
        </span>
      </div>
      <div className="absolute top-1.5 left-1.5 right-1.5 h-[1px] bg-emerald-500/20" />
      <div className="absolute bottom-1.5 left-1.5 right-1.5 h-[1px] bg-emerald-500/20" />
    </motion.div>
  );
}
