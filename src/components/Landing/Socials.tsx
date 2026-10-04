'use client';

import { motion } from 'framer-motion';
import { LinkedinLogo, Envelope } from '@phosphor-icons/react';
import { SOCIAL_LINKS } from '@/lib/constants';

const links = [
  { href: SOCIAL_LINKS.linkedin, icon: LinkedinLogo, label: 'LinkedIn' },
  { href: SOCIAL_LINKS.email, icon: Envelope, label: 'Email' },
];

export function Socials() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: 1.6, duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
      className="flex items-center gap-4"
    >
      {links.map(({ href, icon: Icon, label }) => (
        <a
          key={label}
          href={href}
          target={href.startsWith('http') ? '_blank' : undefined}
          rel={href.startsWith('http') ? 'noopener noreferrer' : undefined}
          aria-label={label}
          className="p-3 rounded-full border border-white/10 text-foreground/80 hover:text-foreground hover:border-accent/50 hover:bg-accent/10 hover:scale-110 transition-all duration-300"
        >
          <Icon size={20} weight="light" />
        </a>
      ))}
    </motion.div>
  );
}
