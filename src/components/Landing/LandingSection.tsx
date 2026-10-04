'use client';

import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { DitherPortrait } from './DitherPortrait';
import { AnimatedName } from './AnimatedName';
import { Tagline } from './Tagline';
import { Socials } from './Socials';

function formatTime() {
  const now = new Date();
  const timeString = now.toLocaleTimeString('en-GB', {
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: false,
  });
  const offset = -now.getTimezoneOffset() / 60;
  const offsetString = `${offset >= 0 ? '+' : '-'}${String(Math.abs(offset)).padStart(2, '0')}`;
  return `${timeString} ${offsetString}`;
}

export function LandingSection() {
  const [time, setTime] = useState(formatTime());

  useEffect(() => {
    const timer = setInterval(() => setTime(formatTime()), 1000);
    return () => clearInterval(timer);
  }, []);

  return (
    <section
      id="landing"
      className="relative min-h-[100dvh] w-full overflow-hidden bg-background"
    >
      <DitherPortrait />

      <div
        className="absolute inset-x-0 bottom-0 top-0 z-[5] pointer-events-none"
        style={{
          background:
            'linear-gradient(to top, rgba(10,10,10,0.95) 0%, rgba(10,10,10,0.6) 35%, transparent 100%)',
        }}
      />

      <div className="relative z-10 flex min-h-[100dvh] flex-col justify-end px-6 md:px-10 pb-24">
        <div className="max-w-[1800px] mx-auto w-full">
          <div className="flex flex-col gap-4 mb-8">
            <AnimatedName />
            <div className="flex flex-col md:flex-row md:items-end gap-4 md:gap-8">
              <Tagline />
              <Socials />
            </div>
          </div>
        </div>
      </div>

      <div className="absolute bottom-0 left-0 right-0 z-20 px-6 md:px-10 py-4 border-t border-white/5 bg-background/60 backdrop-blur-sm">
        <div className="max-w-[1800px] mx-auto flex items-center justify-between font-mono text-[10px] md:text-xs tracking-widest text-foreground/60">
          <span className="hidden md:inline">INTRO</span>

          <div className="flex items-center gap-3">
            <span className="text-foreground/40">THEME</span>
            <span
              className="w-3 h-3 rounded-sm"
              style={{ backgroundColor: '#c3fffc' }}
            />
            <span className="text-foreground/80">#C3FFFC</span>
            <span className="hidden sm:inline text-foreground/40 ml-2">
              {time}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <span>SCROLL</span>
            <motion.svg
              width="12"
              height="8"
              viewBox="0 0 20 12"
              fill="none"
              animate={{ y: [0, 3, 0] }}
              transition={{
                repeat: Infinity,
                duration: 1.6,
                ease: 'easeInOut',
              }}
            >
              <path
                d="M2 2L10 10L18 2"
                stroke="currentColor"
                strokeWidth="1.5"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </motion.svg>
          </div>
        </div>
      </div>
    </section>
  );
}
