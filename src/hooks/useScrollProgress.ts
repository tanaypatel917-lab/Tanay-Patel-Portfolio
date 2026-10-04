'use client';

import { RefObject } from 'react';
import { useScroll, MotionValue } from 'framer-motion';

export function useScrollProgress(
  ref: RefObject<HTMLElement | null>,
  offset: [string, string] = ['start end', 'end start']
): { scrollYProgress: MotionValue<number> } {
  return useScroll({
    target: ref,
    offset: offset as [string, string] as [any, any],
  });
}
