'use client';

import { useEffect, useRef, useState } from 'react';
import { useGLTF, useProgress } from '@react-three/drei';
import { motion, AnimatePresence } from 'framer-motion';
import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';

gsap.registerPlugin(ScrollTrigger);

export function Preloader({ children }: { children: React.ReactNode }) {
  const [isReady, setIsReady] = useState(false);
  const { active, progress } = useProgress();
  const minDuration = 1500;
  const maxDuration = 6000;

  // Preload the heaviest 3D asset so the rest of the app can use it from cache.
  useGLTF.preload('/models/car.glb');

  const activeRef = useRef(active);
  const startRef = useRef(Date.now());

  useEffect(() => {
    activeRef.current = active;
  }, [active]);

  useEffect(() => {
    const timer = setInterval(() => {
      const elapsed = Date.now() - startRef.current;
      const done = !activeRef.current || elapsed >= maxDuration;
      if (done && elapsed >= minDuration) {
        setIsReady(true);
      }
    }, 50);

    return () => clearInterval(timer);
  }, [minDuration, maxDuration]);

  useEffect(() => {
    if (!isReady) return;
    const id = setTimeout(() => {
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          ScrollTrigger.refresh();
        });
      });
    }, 600);
    return () => clearTimeout(id);
  }, [isReady]);

  return (
    <>
      <AnimatePresence>
        {!isReady && (
          <motion.div
            initial={{ y: 0 }}
            exit={{ y: '-100%' }}
            transition={{ duration: 0.8, ease: [0.76, 0, 0.24, 1] }}
            className="fixed inset-0 z-[200] flex flex-col items-center justify-center bg-background"
          >
            <svg
              width="120"
              height="120"
              viewBox="0 0 120 120"
              className="mb-8 -rotate-90"
            >
              <text
                x="60"
                y="78"
                textAnchor="middle"
                className="font-display text-[56px] font-bold fill-foreground"
                style={{ fontFamily: 'Chillax, sans-serif' }}
              >
                TP
              </text>
              <circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-surface-border"
              />
              <motion.circle
                cx="60"
                cy="60"
                r="54"
                fill="none"
                stroke="currentColor"
                strokeWidth="1"
                className="text-accent"
                strokeDasharray={339.292}
                initial={{ strokeDashoffset: 339.292 }}
                animate={{ strokeDashoffset: 0 }}
                transition={{ duration: 2, ease: 'easeInOut' }}
              />
            </svg>

            <div className="w-48 h-[2px] bg-surface-border overflow-hidden rounded-full">
              <motion.div
                className="h-full bg-accent"
                initial={{ width: '0%' }}
                animate={{ width: `${Math.max(5, Math.min(progress, 100))}%` }}
                transition={{ duration: 0.1 }}
              />
            </div>
          </motion.div>
        )}
      </AnimatePresence>
      {isReady && children}
    </>
  );
}
