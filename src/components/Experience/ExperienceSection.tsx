'use client';

import { useRef, useEffect } from 'react';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { motion, useMotionValue, useTransform, type MotionValue } from 'framer-motion';
import { useReducedMotion } from '@/hooks/useReducedMotion';

gsap.registerPlugin(ScrollTrigger);

const ITEMS = [
  {
    id: 'exp-1',
    title: 'Freelance web projects',
    role: 'Builder & designer',
    period: '2023 — Present',
    description:
      'I design and build sites for small businesses and personal brands. I handle everything from the interface to deployment, learning something new every build.',
  },
  {
    id: 'exp-2',
    title: 'Car meet organizer',
    role: 'Community lead',
    period: '2022 — Present',
    description:
      'I help run local meets, connect builders with mentors, and learn from the network of people who actually work on cars, finance, and side businesses.',
  },
  {
    id: 'exp-3',
    title: 'Finance & investing learner',
    role: 'Self-directed',
    period: '2021 — Present',
    description:
      'I manage my own portfolio, track spending, and study market behavior. It has taught me discipline, research, and the power of compounding over time.',
  },
];

export function ExperienceSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const progress = useMotionValue(0);
  const reduced = useReducedMotion();

  useEffect(() => {
    if (reduced) {
      progress.set(1);
      return;
    }

    const ctx = gsap.context(() => {
      ScrollTrigger.create({
        trigger: sectionRef.current,
        start: 'top 80%',
        end: 'bottom 20%',
        scrub: 1,
        onUpdate: (self) => {
          progress.set(self.progress);
        },
      });
    }, sectionRef);

    return () => ctx.revert();
  }, [reduced, progress]);

  const lineHeight = useTransform(progress, [0, 1], ['0%', '100%']);

  return (
    <section
      ref={sectionRef}
      id="experience"
      className="relative w-full bg-background py-32 md:py-48 overflow-hidden"
      aria-label="Experience"
    >
      <div className="max-w-6xl mx-auto px-6 md:px-10">
        <div className="mb-16 md:mb-24">
          <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold text-foreground tracking-tight">
            EXPERIENCE
          </h2>
          <p className="mt-4 text-muted text-base md:text-lg max-w-xl">
            A few of the lanes I have been building in — projects, community, and self-driven learning.
          </p>
        </div>

        <div className="relative">
          {/* timeline line */}
          <div className="absolute left-0 md:left-1/2 top-0 bottom-0 w-px bg-surface-border md:-translate-x-1/2">
            <motion.div
              style={{ height: lineHeight }}
              className="w-full bg-accent"
            />
          </div>

          {ITEMS.map((item, index) => (
            <TimelineCard
              key={item.id}
              item={item}
              index={index}
              total={ITEMS.length}
              progress={progress}
            />
          ))}
        </div>
      </div>
    </section>
  );
}

function TimelineCard({
  item,
  index,
  total,
  progress,
}: {
  item: (typeof ITEMS)[0];
  index: number;
  total: number;
  progress: MotionValue<number>;
}) {
  const isLeft = index % 2 === 0;
  const start = (index + 0.2) / total;
  const end = (index + 0.8) / total;

  const opacity = useTransform(progress, [start, (start + end) / 2, end], [0, 1, 1]);
  const y = useTransform(progress, [start, end], [40, 0]);
  const scale = useTransform(progress, [start, (start + end) / 2], [0.96, 1]);

  return (
    <div
      className={`relative flex flex-col md:flex-row items-start md:items-center gap-8 md:gap-0 mb-16 md:mb-24 ${
        isLeft ? 'md:flex-row-reverse' : ''
      }`}
    >
      {/* node */}
      <div className="absolute left-0 md:left-1/2 top-2 md:top-1/2 w-3 h-3 rounded-full bg-accent -translate-x-1.5 md:-translate-x-1.5 md:-translate-y-1/2 shadow-[0_0_12px_rgba(74,158,255,0.5)]" />

      <div className="w-full md:w-1/2 pl-8 md:pl-0 md:px-16">
        <motion.div
          style={{ opacity, y, scale }}
          className={`bg-surface/60 backdrop-blur-sm border border-white/10 rounded-2xl p-6 md:p-8 ${
            isLeft ? 'md:text-right' : 'md:text-left'
          }`}
        >
          <span className="text-accent text-sm font-medium tracking-widest uppercase">
            {item.period}
          </span>
          <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mt-2 mb-1">
            {item.title}
          </h3>
          <p className="text-foreground/70 text-sm md:text-base font-medium mb-3">
            {item.role}
          </p>
          <p className="text-muted text-sm md:text-base leading-relaxed">
            {item.description}
          </p>
        </motion.div>
      </div>

      <div className="hidden md:block w-1/2" />
    </div>
  );
}
