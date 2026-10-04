'use client';

import { createElement, useLayoutEffect, useRef, type ReactNode } from 'react';
import { gsap, EASE_OUT } from '@/lib/motion';
import { useMotionPolicy } from './MotionProvider';

interface RevealProps {
  children: ReactNode;
  className?: string;
  /** Seconds. Keep stagger under 60ms per item. */
  delay?: number;
  as?: 'div' | 'li' | 'article' | 'header';
}

/**
 * One-shot 12px settling motion when an element enters the viewport. The element
 * is visible in server HTML and throughout enhancement; reduced motion and
 * interrupted effects restore the ordinary document layout.
 */
export function Reveal({ children, className, delay = 0, as = 'div' }: RevealProps) {
  const ref = useRef<HTMLElement>(null);
  const played = useRef(false);
  const { reduced, documentVisible } = useMotionPolicy();

  useLayoutEffect(() => {
    const element = ref.current;
    if (!element || reduced || !documentVisible || played.current) return;
    const ctx = gsap.context(() => {
      gsap.fromTo(element, { y: 12 }, {
        y: 0,
        duration: 0.5,
        delay,
        ease: EASE_OUT,
        clearProps: 'transform',
        scrollTrigger: {
          trigger: element,
          start: 'top 92%',
          once: true,
          onEnter: () => { played.current = true; },
        },
      });
    }, element);
    return () => ctx.revert();
  }, [delay, reduced, documentVisible]);

  return createElement(as, { ref, className, 'data-reveal': '' }, children);
}
