'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import Lenis from 'lenis';
import { gsap, ScrollTrigger } from '@/lib/motion';
import { portfolioContent, type PortfolioSectionId } from '@/content/portfolio';
import { getUserReducedMotion, setUserReducedMotion, useReducedMotion, useSystemReducedMotion, useUserReducedMotion } from '@/hooks/useReducedMotion';

interface NavigateOptions {
  immediate?: boolean;
  history?: 'push' | 'replace' | 'none';
  focus?: boolean;
  onComplete?: () => void;
}

interface MotionContextValue {
  lenis: Lenis | null;
  ready: boolean;
  reduced: boolean;
  userReduced: boolean;
  systemReduced: boolean;
  documentVisible: boolean;
  locked: boolean;
  activeSection: PortfolioSectionId;
  replayId: number;
  acquireScrollLock: (reason: string) => () => void;
  navigateTo: (href: string, options?: NavigateOptions) => boolean;
  requestIntroReplay: () => void;
  toggleMotionReduction: () => void;
}

const MotionContext = createContext<MotionContextValue | null>(null);

export function useMotion() {
  const context = useContext(MotionContext);
  if (!context) throw new Error('MotionProvider is required');
  return context;
}

export function useMotionPolicy() {
  const { reduced, documentVisible, locked } = useMotion();
  return { reduced, documentVisible, locked };
}

export function useLenis(): Lenis | null {
  return useMotion().lenis;
}

/**
 * The page's motion engine: Lenis inertia scrolling driven by GSAP's ticker and
 * kept in sync with ScrollTrigger. Under `prefers-reduced-motion` Lenis is not
 * created at all and ScrollTrigger falls back to native scroll for its state
 * toggles; every scrubbed animation checks the same preference itself.
 *
 * In-page anchors are handled here so the native jump is prevented, the hash
 * still updates, and focus moves to the target section for keyboard users.
 */
export function MotionProvider({ children }: { children: ReactNode }) {
  const reduced = useReducedMotion();
  const userReduced = useUserReducedMotion();
  const systemReduced = useSystemReducedMotion();
  const reducedRef = useRef(reduced);
  reducedRef.current = reduced;
  const [ready, setReady] = useState(false);
  const [documentVisible, setDocumentVisible] = useState(true);
  const visibleRef = useRef(true);
  const [lenis, setLenis] = useState<Lenis | null>(null);
  const lenisRef = useRef<Lenis | null>(null);
  const [locked, setLocked] = useState(false);
  const locks = useRef(new Map<symbol, string>());
  const previousOverflow = useRef<{ html: string; body: string } | null>(null);
  const [activeSection, setActiveSection] = useState<PortfolioSectionId>('top');
  const activeRef = useRef<PortfolioSectionId>('top');
  const [replayId, setReplayId] = useState(0);

  const restoreScroll = useCallback(() => {
    if (locks.current.size || !previousOverflow.current) return;
    document.documentElement.style.overflow = previousOverflow.current.html;
    document.body.style.overflow = previousOverflow.current.body;
    document.documentElement.removeAttribute('data-scroll-locked');
    previousOverflow.current = null;
    if (visibleRef.current) lenisRef.current?.start();
    setLocked(false);
  }, []);

  const acquireScrollLock = useCallback((reason: string) => {
    const token = Symbol(reason);
    if (locks.current.size === 0) {
      previousOverflow.current = {
        html: document.documentElement.style.overflow,
        body: document.body.style.overflow,
      };
      document.documentElement.style.overflow = 'hidden';
      document.body.style.overflow = 'hidden';
      document.documentElement.setAttribute('data-scroll-locked', '');
      lenisRef.current?.stop();
      setLocked(true);
    }
    locks.current.set(token, reason);
    return () => {
      if (!locks.current.delete(token)) return;
      restoreScroll();
    };
  }, [restoreScroll]);

  const navigateTo = useCallback((href: string, options: NavigateOptions = {}) => {
    if (!href.startsWith('#') || locks.current.size) return false;
    let id: string;
    try {
      id = decodeURIComponent(href.slice(1));
    } catch {
      return false;
    }
    const target = document.getElementById(id || 'top');
    if (!target) return false;
    const destination = `#${encodeURIComponent(id || 'top')}`;
    const mode = options.history ?? 'push';
    if (mode !== 'none' && location.hash !== destination) {
      if (mode === 'replace') history.replaceState(null, '', destination);
      else history.pushState(null, '', destination);
    }
    const finish = () => {
      if (options.focus !== false) target.focus({ preventScroll: true });
      options.onComplete?.();
    };
    const immediate = reducedRef.current || options.immediate === true;
    if (lenisRef.current) {
      const instance = lenisRef.current;
      instance.stop();
      instance.resize();
      instance.start();
      instance.scrollTo(target, { immediate, onComplete: finish });
    } else {
      target.scrollIntoView({ behavior: immediate ? 'instant' : 'smooth', block: 'start' });
      finish();
    }
    return true;
  }, []);

  const requestIntroReplay = useCallback(() => {
    if (reducedRef.current || locks.current.size) return;
    navigateTo('#top', {
      immediate: true,
      onComplete: () => setReplayId((current) => current + 1),
    });
  }, [navigateTo]);

  const toggleMotionReduction = useCallback(() => setUserReducedMotion(!getUserReducedMotion()), []);

  useEffect(() => {
    setReady(true);
    const onVisibility = () => {
      visibleRef.current = document.visibilityState === 'visible';
      setDocumentVisible(visibleRef.current);
      if (!visibleRef.current) lenisRef.current?.stop();
      else if (locks.current.size === 0) lenisRef.current?.start();
    };
    onVisibility();
    document.addEventListener('visibilitychange', onVisibility);
    const currentLocks = locks.current;
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      currentLocks.clear();
      restoreScroll();
    };
  }, [restoreScroll]);

  useEffect(() => {
    if (!ready || reduced) return;
    const instance = new Lenis({
      duration: 0.9,
      easing: (t) => 1 - Math.pow(1 - t, 4),
      smoothWheel: true,
    });
    lenisRef.current = instance;
    setLenis(instance);
    if (locks.current.size || !visibleRef.current) instance.stop();
    instance.on('scroll', ScrollTrigger.update);
    const tick = (time: number) => {
      if (visibleRef.current) instance.raf(time * 1000);
    };
    gsap.ticker.add(tick);
    gsap.ticker.lagSmoothing(0);
    return () => {
      gsap.ticker.remove(tick);
      instance.off('scroll', ScrollTrigger.update);
      instance.destroy();
      lenisRef.current = null;
      setLenis(null);
    };
  }, [ready, reduced]);

  useEffect(() => {
    if (!ready) return;
    let alive = true;
    let sections: Array<{ id: PortfolioSectionId; top: number }> = [];
    const update = () => {
      const header = parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 64;
      const line = window.scrollY + header + 1;
      let next: PortfolioSectionId = 'top';
      for (const section of sections) if (section.top <= line) next = section.id;
      if (window.scrollY > 0 && document.documentElement.scrollHeight - window.innerHeight - window.scrollY < 2) next = 'contact';
      if (next !== activeRef.current) {
        activeRef.current = next;
        setActiveSection(next);
      }
      document.documentElement.toggleAttribute('data-night', next === 'cars' || next === 'contact');
    };
    const measure = () => {
      sections = portfolioContent.navigation.flatMap(({ target }) => {
        const element = document.getElementById(target);
        return element ? [{ id: target, top: element.getBoundingClientRect().top + window.scrollY }] : [];
      });
      update();
    };
    const tracker = ScrollTrigger.create({ start: 0, end: 'max', onUpdate: update, onRefresh: measure });
    measure();
    const initialHash = location.hash;
    const initialFrame = requestAnimationFrame(() => {
      if (initialHash) navigateTo(initialHash, { immediate: true, history: 'none', focus: false });
      ScrollTrigger.refresh();
    });
    document.fonts.ready.then(() => {
      if (alive) ScrollTrigger.refresh();
    });
    const onClick = (event: MouseEvent) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) return;
      const anchor = (event.target as Element | null)?.closest?.('a[href^="#"]');
      if (!(anchor instanceof HTMLAnchorElement) || anchor.hasAttribute('download') || anchor.target === '_blank') return;
      if (navigateTo(anchor.getAttribute('href') || '')) event.preventDefault();
    };
    const onHistory = () => {
      if (location.hash) navigateTo(location.hash, { immediate: true, history: 'none' });
      update();
    };
    document.addEventListener('click', onClick);
    window.addEventListener('popstate', onHistory);
    window.addEventListener('hashchange', onHistory);
    return () => {
      alive = false;
      cancelAnimationFrame(initialFrame);
      tracker.kill();
      document.removeEventListener('click', onClick);
      window.removeEventListener('popstate', onHistory);
      window.removeEventListener('hashchange', onHistory);
      document.documentElement.removeAttribute('data-night');
    };
  }, [ready, navigateTo]);

  const value = useMemo(() => ({
    lenis, ready, reduced, userReduced, systemReduced, documentVisible, locked, activeSection, replayId,
    acquireScrollLock, navigateTo, requestIntroReplay, toggleMotionReduction,
  }), [lenis, ready, reduced, userReduced, systemReduced, documentVisible, locked, activeSection, replayId,
    acquireScrollLock, navigateTo, requestIntroReplay, toggleMotionReduction]);

  return <MotionContext.Provider value={value}>{children}</MotionContext.Provider>;
}
