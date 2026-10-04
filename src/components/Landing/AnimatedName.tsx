'use client';

import { useRef, useEffect, useState } from 'react';
import { motion, useSpring, useTransform } from 'framer-motion';
import { useMousePosition } from '@/hooks/useMousePosition';

const name = ['TANAY', 'PATEL'];

export function AnimatedName() {
  const { rawX, rawY } = useMousePosition();
  const [size, setSize] = useState({ w: 1, h: 1 });

  useEffect(() => {
    const update = () =>
      setSize({ w: window.innerWidth, h: window.innerHeight });
    update();
    window.addEventListener('resize', update);
    return () => window.removeEventListener('resize', update);
  }, []);

  const x = useTransform(rawX, [0, size.w], [18, -18]);
  const y = useTransform(rawY, [0, size.h], [10, -10]);

  const springX = useSpring(x, { stiffness: 80, damping: 20 });
  const springY = useSpring(y, { stiffness: 80, damping: 20 });

  return (
    <motion.div
      style={{ x: springX, y: springY }}
      className="flex flex-col leading-none"
    >
      {name.map((word, wordIndex) => (
        <div key={word} className="flex overflow-hidden">
          {word.split('').map((letter, i) => (
            <motion.span
              key={`${word}-${i}`}
              initial={{ y: 40, opacity: 0 }}
              animate={{ y: 0, opacity: 1 }}
              transition={{
                duration: 0.65,
                delay: wordIndex * 0.25 + i * 0.05,
                ease: [0.16, 1, 0.3, 1],
              }}
              className="font-display font-semibold text-foreground select-none mix-blend-difference"
              style={{
                fontSize: 'clamp(56px, 12vw, 160px)',
                letterSpacing: '-0.03em',
                willChange: 'transform, opacity',
              }}
            >
              {letter}
            </motion.span>
          ))}
        </div>
      ))}
    </motion.div>
  );
}
