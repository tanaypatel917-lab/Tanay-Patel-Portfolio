'use client';

import { useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useMousePosition } from '@/hooks/useMousePosition';

export function PhotoReveal() {
  const { rawX, rawY } = useMousePosition();
  const [size, setSize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    const update = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const x = useTransform(rawX, [0, size.w], [-12, 12]);
  const y = useTransform(rawY, [0, size.h], [-8, 8]);
  const springX = useSpring(x, { stiffness: 100, damping: 20 });
  const springY = useSpring(y, { stiffness: 100, damping: 20 });

  return (
    <motion.div
      style={{ x: springX, y: springY }}
      className="relative group w-40 h-52 md:w-64 md:h-80 lg:w-72 lg:h-[420px] overflow-hidden rounded-[2rem]"
    >
      <img
        src="/images/tanay-headshot.jpg"
        alt="Tanay Patel"
        className="w-full h-full object-cover transition-all duration-[400ms] ease-out saturate-[0.1] brightness-90 group-hover:saturate-100 group-hover:brightness-100"
      />
      <div className="absolute inset-0 bg-accent/10 mix-blend-overlay transition-opacity duration-400 group-hover:opacity-0" />
    </motion.div>
  );
}
