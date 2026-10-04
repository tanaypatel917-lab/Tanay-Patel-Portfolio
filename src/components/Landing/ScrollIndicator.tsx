'use client';

import { motion, useScroll, useTransform } from 'framer-motion';

export function ScrollIndicator() {
  const { scrollY } = useScroll();
  const opacity = useTransform(scrollY, [0, 100], [1, 0]);

  return (
    <motion.div
      style={{ opacity }}
      className="absolute bottom-8 left-1/2 -translate-x-1/2 flex flex-col items-center gap-2 text-foreground/60"
    >
      <span className="text-[10px] uppercase tracking-[0.25em] font-medium">
        scroll
      </span>
      <motion.svg
        width="20"
        height="12"
        viewBox="0 0 20 12"
        fill="none"
        animate={{ y: [0, 6, 0] }}
        transition={{ repeat: Infinity, duration: 1.6, ease: 'easeInOut' }}
      >
        <path
          d="M2 2L10 10L18 2"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </motion.svg>
    </motion.div>
  );
}
