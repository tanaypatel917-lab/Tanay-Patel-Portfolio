'use client';

import { motion } from 'framer-motion';

const TAGLINE = 'Builder · Enthusiast · Creator';

export function Tagline() {
  return (
    <div className="overflow-hidden">
      <motion.p
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ delay: 1.2, duration: 0.3 }}
        className="text-sm md:text-base lg:text-lg tracking-[0.2em] text-foreground/80 font-medium"
      >
        {TAGLINE.split('').map((char, i) => (
          <motion.span
            key={i}
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{
              delay: 1.2 + i * 0.03,
              duration: 0.15,
              ease: 'easeOut',
            }}
          >
            {char}
          </motion.span>
        ))}
      </motion.p>
    </div>
  );
}
