'use client';

import { useRef } from 'react';
import { motion, useScroll, useSpring, useTransform, type MotionValue } from 'framer-motion';
import { MoneyStack } from './MoneyStack';
import { useReducedMotion } from '@/hooks/useReducedMotion';

export function FinanceSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 25 });
  const reduced = useReducedMotion();

  if (reduced) {
    progress.set(0.5);
  }

  const titleOpacity = useTransform(progress, [0, 0.15, 0.35], [0, 1, 0]);
  const titleY = useTransform(progress, [0, 0.15, 0.35], [40, 0, -40]);

  return (
    <section
      ref={sectionRef}
      id="finance"
      className="relative w-full min-h-[250dvh] bg-background overflow-hidden"
      aria-label="Finance"
    >
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden">
        <div className="absolute inset-0 z-0 opacity-60 md:opacity-100">
          <MoneyStack progress={progress} />
        </div>

        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-start pt-24 md:pt-32 px-6">
          <motion.div
            style={{ opacity: titleOpacity, y: titleY }}
            className="text-center"
          >
            <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold text-foreground tracking-tight mix-blend-difference">
              FINANCE
            </h2>
          </motion.div>
        </div>

        <div className="absolute bottom-12 left-6 right-6 md:left-12 md:right-auto z-10 max-w-sm pointer-events-none">
          <Card progress={progress} inStart={0.22} visibleStart={0.32} outEnd={0.48}>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-2">
              Investing early
            </h3>
            <p className="text-muted text-sm md:text-base leading-relaxed">
              I started learning about markets, ETFs, and compounding as soon as I could. Watching money work over time is the same patience I bring to long projects.
            </p>
          </Card>
        </div>

        <div className="absolute bottom-12 right-6 left-6 md:left-auto md:right-12 z-10 max-w-sm pointer-events-none md:text-right">
          <Card progress={progress} inStart={0.46} visibleStart={0.56} outEnd={0.72}>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-2">
              Building discipline
            </h3>
            <p className="text-muted text-sm md:text-base leading-relaxed">
              Budgeting, tracking, and saving are not restrictions — they are the foundation that lets me take bigger swings on cars, keyboards, and ideas.
            </p>
          </Card>
        </div>

        <div className="absolute bottom-12 left-6 right-6 md:left-1/2 md:-translate-x-1/2 md:right-auto z-10 max-w-sm pointer-events-none md:text-center">
          <Card progress={progress} inStart={0.70} visibleStart={0.80} outEnd={1}>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-2">
              Long-term thinking
            </h3>
            <p className="text-muted text-sm md:text-base leading-relaxed">
              Whether it is a portfolio or a project, I think in decades. Small, consistent moves turn into outcomes you can actually see.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Card({
  progress,
  inStart,
  visibleStart,
  outEnd,
  children,
}: {
  progress: MotionValue<number>;
  inStart: number;
  visibleStart: number;
  outEnd: number;
  children: React.ReactNode;
}) {
  const opacity = useTransform(
    progress,
    [inStart, visibleStart, outEnd],
    [0, 1, 1]
  );
  const y = useTransform(
    progress,
    [inStart, visibleStart, outEnd],
    [24, 0, 0]
  );

  return (
    <motion.div
      style={{ opacity, y }}
      className="bg-surface/85 backdrop-blur-md border border-white/10 rounded-2xl p-5 md:p-6 text-left pointer-events-none"
    >
      {children}
    </motion.div>
  );
}
