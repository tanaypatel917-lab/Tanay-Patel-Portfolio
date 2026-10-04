'use client';

import { useEffect, useRef } from 'react';
import { useMotionValue, useSpring, MotionValue } from 'framer-motion';

interface MousePosition {
  x: MotionValue<number>;
  y: MotionValue<number>;
  rawX: MotionValue<number>;
  rawY: MotionValue<number>;
}

export function useMousePosition(): MousePosition {
  const rawX = useMotionValue(0);
  const rawY = useMotionValue(0);

  const x = useSpring(rawX, { stiffness: 150, damping: 15, mass: 0.1 });
  const y = useSpring(rawY, { stiffness: 150, damping: 15, mass: 0.1 });

  const isClient = typeof window !== 'undefined';

  useEffect(() => {
    if (!isClient) return;

    const handleMouseMove = (e: MouseEvent) => {
      rawX.set(e.clientX);
      rawY.set(e.clientY);
    };

    window.addEventListener('mousemove', handleMouseMove, { passive: true });
    return () => window.removeEventListener('mousemove', handleMouseMove);
  }, [rawX, rawY, isClient]);

  return { x, y, rawX, rawY };
}
