'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useMotionValue } from 'framer-motion';
import { useMousePosition } from '@/hooks/useMousePosition';

export function Cursor() {
  const { rawX, rawY } = useMousePosition();
  const [isHovering, setIsHovering] = useState(false);
  const [isClicking, setIsClicking] = useState(false);
  const [disabled, setDisabled] = useState(false);

  const smoothConfig = { stiffness: 300, damping: 25, mass: 0.5 };
  const x = useSpring(rawX, smoothConfig);
  const y = useSpring(rawY, smoothConfig);

  const [handOpen, setHandOpen] = useState(false);

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-reduced-motion: reduce)');
    const pointerQuery = window.matchMedia('(pointer: coarse)');

    const update = () => {
      setDisabled(mediaQuery.matches || pointerQuery.matches);
    };

    update();
    mediaQuery.addEventListener('change', update);
    pointerQuery.addEventListener('change', update);

    return () => {
      mediaQuery.removeEventListener('change', update);
      pointerQuery.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    if (disabled) return;

    const onMouseDown = () => setIsClicking(true);
    const onMouseUp = () => setIsClicking(false);

    const onMouseOver = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('a, button, [role="button"], input, textarea, select')
      ) {
        setIsHovering(true);
      }
    };

    const onMouseOut = (e: MouseEvent) => {
      const target = e.target as HTMLElement;
      if (
        target.closest('a, button, [role="button"], input, textarea, select')
      ) {
        setIsHovering(false);
      }
    };

    const onSectionChange = (e: Event) => {
      const detail = (e as CustomEvent).detail as { section?: string };
      setHandOpen(detail?.section === 'finance');
    };

    window.addEventListener('mousedown', onMouseDown);
    window.addEventListener('mouseup', onMouseUp);
    window.addEventListener('mouseover', onMouseOver, { passive: true });
    window.addEventListener('mouseout', onMouseOut, { passive: true });
    window.addEventListener('cursor-section' as any, onSectionChange);

    return () => {
      window.removeEventListener('mousedown', onMouseDown);
      window.removeEventListener('mouseup', onMouseUp);
      window.removeEventListener('mouseover', onMouseOver);
      window.removeEventListener('mouseout', onMouseOut);
      window.removeEventListener('cursor-section' as any, onSectionChange);
    };
  }, [disabled]);

  useEffect(() => {
    x.set(rawX.get());
    y.set(rawY.get());
  }, [rawX, rawY, x, y]);

  if (disabled) return null;

  return (
    <>
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[100] rounded-full bg-foreground mix-blend-difference"
        style={{
          x,
          y,
          translateX: '-50%',
          translateY: '-50%',
          width: isClicking ? 6 : 8,
          height: isClicking ? 6 : 8,
        }}
      />
      <motion.div
        className="fixed top-0 left-0 pointer-events-none z-[99] rounded-full border border-foreground/80"
        style={{
          x,
          y,
          translateX: '-50%',
          translateY: '-50%',
        }}
        animate={{
          width: isHovering ? 48 : 32,
          height: isHovering ? 48 : 32,
          backgroundColor: isHovering
            ? 'rgba(74, 158, 255, 0.2)'
            : 'rgba(255,255,255,0)',
          borderColor: isHovering ? '#4a9eff' : 'rgba(250,250,250,0.8)',
        }}
        transition={{ type: 'spring', stiffness: 200, damping: 20 }}
      />
    </>
  );
}
