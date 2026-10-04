'use client';

import { gsap } from 'gsap';
import { ScrollTrigger } from 'gsap/ScrollTrigger';
import { getReducedMotion } from '@/hooks/useReducedMotion';

/**
 * Single GSAP setup for the page. Import `gsap` from here (or register through
 * this module once) so plugins are registered exactly once on the client.
 */
gsap.registerPlugin(ScrollTrigger);

export { gsap, ScrollTrigger };

/** Strong ease-out used for every entrance on the page. */
export const EASE_OUT = 'expo.out';

/** Hex noise for ScrambleText: the "noise" the labels resolve from. */
export const SCRAMBLE_CHARS = '0123456789ABCDEF';

export function prefersReducedMotion(): boolean {
  return getReducedMotion();
}

export function hasFinePointer(): boolean {
  return typeof window !== 'undefined' && window.matchMedia('(hover: hover) and (pointer: fine)').matches;
}

/** Session flag: the intro counter plays once per browser session. */
export const INTRO_SEEN_KEY = 'tp-intro';

export function introSeen(): boolean {
  try {
    return sessionStorage.getItem(INTRO_SEEN_KEY) === '1';
  } catch {
    return false;
  }
}

export function markIntroSeen(): void {
  try {
    sessionStorage.setItem(INTRO_SEEN_KEY, '1');
  } catch {
    /* private mode: the counter simply plays again next time */
  }
}
