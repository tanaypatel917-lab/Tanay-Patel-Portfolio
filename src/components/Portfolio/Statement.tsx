'use client';

import { useLayoutEffect, useRef } from 'react';
import { Emphasis } from './Emphasis';
import { EASE_OUT, gsap, ScrollTrigger } from '@/lib/motion';
import { useMotionPolicy } from '@/components/shared/MotionProvider';

interface StatementProps {
  id?: string;
  text: string;
  className?: string;
  /** Draw the vermilion strike through the emphasised phrase once in view. */
  strike?: boolean;
}

/**
 * Chapter statement: a small settling motion when the heading enters the
 * viewport, with an optional strike through its serif phrase. Content remains
 * visible and readable before scripts run and after interrupted transitions.
 */
export function Statement({ id, text, className = 'statement', strike = false }: StatementProps) {
  const ref = useRef<HTMLHeadingElement>(null);
  const played = useRef(false);
  const { reduced, documentVisible } = useMotionPolicy();

  useLayoutEffect(() => {
    const heading = ref.current;
    if (!heading || reduced || !documentVisible || played.current) return;
    const ctx = gsap.context(() => {});
    const trigger = ScrollTrigger.create({
      trigger: heading,
      start: 'top 88%',
      once: true,
      onEnter: () => ctx.add(() => {
        played.current = true;
        const timeline = gsap.timeline({ defaults: { ease: EASE_OUT } });
        timeline.fromTo(heading, { y: 16 }, { y: 0, duration: 0.65, clearProps: 'transform' });
        const line = heading.querySelector('.strike');
        if (line) timeline.fromTo(line, { scaleX: 0 }, { scaleX: 1, duration: 0.55 }, 0.15);
      }),
    });
    return () => {
      trigger.kill();
      ctx.revert();
    };
  }, [reduced, documentVisible, text]);

  return <h2 ref={ref} id={id} className={className}><Emphasis text={text} strike={strike} /></h2>;
}
