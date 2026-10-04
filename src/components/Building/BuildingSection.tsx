'use client';

import { useRef, useEffect, useState } from 'react';
import {
  motion,
  useMotionValue,
  useSpring,
  useTransform,
  useScroll,
  useMotionValueEvent,
  type MotionValue,
} from 'framer-motion';
import { KeyboardCanvas } from './KeyboardCanvas';
import { useSoundEffect } from '@/hooks/useSoundEffect';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import { KEYBOARD_STRING } from '@/lib/constants';

const KEYCLICK_SOUNDS = ['keyclick-1', 'keyclick-2', 'keyclick-3', 'keyclick-4'] as const;

export function BuildingSection() {
  const sectionRef = useRef<HTMLDivElement>(null);
  const { scrollYProgress } = useScroll({
    target: sectionRef,
    offset: ['start end', 'end start'],
  });
  const progressRef = useRef(0);
  const pulseRef = useRef(0);
  const lastIndex = useRef(-1);
  const { enabled, play } = useSoundEffect();
  const reduced = useReducedMotion();

  const progress = useSpring(scrollYProgress, { stiffness: 200, damping: 25 });

  const titleOpacity = useTransform(progress, [0, 0.25, 0.4], [0, 1, 0]);
  const titleY = useTransform(progress, [0, 0.25, 0.4], [40, 0, -40]);

  useMotionValueEvent(progress, 'change', (p) => {
    progressRef.current = p;

    if (reduced) return;

    const charCount = p * KEYBOARD_STRING.length;
    if (charCount > lastIndex.current + 1) {
      const currentIndex = Math.floor(charCount);
      if (currentIndex > lastIndex.current) {
        lastIndex.current = currentIndex;
        pulseRef.current = 1;
        if (enabled) {
          const sound = KEYCLICK_SOUNDS[currentIndex % KEYCLICK_SOUNDS.length];
          play(sound, { volume: 0.25 });
        }
      }
    }
  });

  return (
    <section
      ref={sectionRef}
      id="building"
      className="relative w-full min-h-[200dvh] bg-background overflow-hidden"
      aria-label="Building"
    >
      <div className="sticky top-0 h-[100dvh] w-full overflow-hidden">
        <KeyboardCanvas progressRef={progressRef} pulseRef={pulseRef} />

        <div className="absolute inset-0 z-10 pointer-events-none flex flex-col items-center justify-center px-6">
          <motion.div
            style={{ opacity: titleOpacity, y: titleY }}
            className="text-center"
          >
            <h2 className="font-display text-5xl md:text-7xl lg:text-8xl font-semibold text-foreground tracking-tight mix-blend-difference">
              BUILDING THINGS
            </h2>
          </motion.div>
        </div>

        <Typewriter progress={progress} />

        <div className="absolute bottom-12 left-6 right-6 md:left-12 md:right-auto z-10 max-w-sm pointer-events-none">
          <Card progress={progress} inStart={0.55} visibleStart={0.7} outEnd={1}>
            <h3 className="font-display text-xl md:text-2xl font-semibold text-foreground mb-2">
              Built from scratch
            </h3>
            <p className="text-muted text-sm md:text-base leading-relaxed">
              Whether it is a custom keyboard, a side project, or a portfolio like this one, I care about the details — the feel, the sound, and the way it comes together.
            </p>
          </Card>
        </div>
      </div>
    </section>
  );
}

function Typewriter({ progress }: { progress: MotionValue<number> }) {
  const [display, setDisplay] = useState('');
  const len = KEYBOARD_STRING.length;

  useMotionValueEvent(progress, 'change', (p) => {
    const idx = Math.min(len, Math.max(0, Math.floor(p * len)));
    setDisplay(KEYBOARD_STRING.slice(0, idx));
  });

  const [showCursor, setShowCursor] = useState(true);
  useEffect(() => {
    const id = setInterval(() => setShowCursor((v) => !v), 530);
    return () => clearInterval(id);
  }, []);

  return (
    <div className="absolute top-[62%] left-1/2 -translate-x-1/2 -translate-y-1/2 z-10 pointer-events-none text-center">
      <span className="font-display text-4xl md:text-6xl lg:text-7xl font-semibold text-foreground tracking-tight whitespace-pre">
        {display}
      </span>
      <span
        className={`font-display text-4xl md:text-6xl lg:text-7xl font-semibold text-accent ${showCursor ? 'opacity-100' : 'opacity-0'} transition-opacity`}
      >
        |
      </span>
    </div>
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
