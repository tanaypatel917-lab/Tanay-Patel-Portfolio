'use client';

import { useLayoutEffect, useRef, type RefObject } from 'react';
import { Flip } from 'gsap/Flip';
import { gsap } from '@/lib/motion';
import { advanceIntro, createIntroState, hasSeenIntro, INTRO_DEADLINE_MS, INTRO_DURATION, INTRO_PREPARE_MS, isIntroEligible, rememberIntro, type IntroEvent, type IntroPhase } from '@/lib/intro';
import { useMotion } from '@/components/shared/MotionProvider';
import { portfolioContent } from '@/content/portfolio';
import type { DitherPortraitHandle } from '@/components/Landing/InteractiveDitherPortrait';

gsap.registerPlugin(Flip);

interface IntroSequenceProps {
  words: readonly string[];
  destinations: readonly RefObject<HTMLSpanElement>[];
  portrait: RefObject<DitherPortraitHandle>;
  portraitElement: RefObject<HTMLDivElement>;
  onState: (phase: IntroPhase) => void;
}

export function IntroSequence({ words, destinations, portrait, portraitElement, onState }: IntroSequenceProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const skipRef = useRef<HTMLButtonElement>(null);
  const attemptRef = useRef(-1);
  const finishRef = useRef<((reason: IntroEvent) => void) | null>(null);
  const { ready, reduced, documentVisible, replayId, acquireScrollLock } = useMotion();
  const { identity, intro, ui } = portfolioContent;

  useLayoutEffect(() => {
    if (!ready) return;
    if (attemptRef.current === replayId) {
      if (reduced || !documentVisible) onState('complete');
      return;
    }
    attemptRef.current = replayId;
    const navigation = performance.getEntriesByType('navigation')[0] as PerformanceNavigationTiming | undefined;
    const firstPaint = performance.getEntriesByName('first-contentful-paint')[0]?.startTime ?? navigation?.responseEnd ?? 0;
    const eligible = isIntroEligible({
      reduced,
      seen: hasSeenIntro(),
      hash: location.hash,
      navigationType: navigation?.type ?? 'navigate',
      scrollY: window.scrollY,
      ageMs: performance.now() - firstPaint,
      visible: documentVisible,
      replay: replayId > 0,
    });
    const dialog = dialogRef.current;
    if (!eligible || !dialog || typeof dialog.showModal !== 'function') {
      portrait.current?.finish();
      onState('complete');
      return;
    }

    let state = createIntroState(performance.now());
    let finished = false;
    let disposed = false;
    let context: gsap.Context | null = null;
    let release: (() => void) | null = null;
    let preparationTimer = 0;
    let watchdog = 0;
    let startFrame = 0;
    const originals = destinations.map((ref) => ref.current).filter((element): element is HTMLSpanElement => Boolean(element));
    const oldVisibility = originals.map((element) => element.style.visibility);
    const portraitStyle = portraitElement.current?.style.clipPath ?? '';
    const previousFocus = document.activeElement;

    const finish = (reason: IntroEvent) => {
      if (finished) return;
      finished = true;
      state = advanceIntro(state, reason, performance.now());
      window.clearTimeout(watchdog);
      window.clearTimeout(preparationTimer);
      cancelAnimationFrame(startFrame);
      context?.revert();
      originals.forEach((element, index) => { element.style.visibility = oldVisibility[index]; });
      if (portraitElement.current) portraitElement.current.style.clipPath = portraitStyle;
      portrait.current?.finish();
      const hadFocus = dialog.contains(document.activeElement);
      if (dialog.open) dialog.close();
      release?.();
      release = null;
      rememberIntro();
      dialog.dataset.state = 'complete';
      dialog.dataset.result = state.reason ?? reason;
      if (!disposed) onState('complete');
      if (hadFocus && reason !== 'unmount' && document.visibilityState === 'visible') {
        document.getElementById('top')?.focus({ preventScroll: true });
      } else if (reason === 'unmount' && previousFocus instanceof HTMLElement && previousFocus.isConnected) {
        previousFocus.focus({ preventScroll: true });
      }
    };
    finishRef.current = finish;
    watchdog = window.setTimeout(() => finish('timeout'), INTRO_DEADLINE_MS);
    onState('preparing');

    const onResize = () => finish('resize');
    const onHidden = () => { if (document.visibilityState !== 'visible') finish('hidden'); };
    const onScrollIntent = () => finish('skip');
    const onKey = (event: KeyboardEvent) => {
      if (['Escape', 'ArrowDown', 'PageDown', 'End'].includes(event.key)) {
        if (event.key === 'Escape') event.preventDefault();
        finish('skip');
      }
    };
    window.addEventListener('resize', onResize);
    document.addEventListener('visibilitychange', onHidden);
    dialog.addEventListener('wheel', onScrollIntent, { passive: true });
    dialog.addEventListener('touchmove', onScrollIntent, { passive: true });
    dialog.addEventListener('keydown', onKey);

    const start = () => {
      if (finished || disposed || window.scrollY > 4 || document.visibilityState !== 'visible') {
        finish('skip');
        return;
      }
      if (performance.now() - state.startedAt >= INTRO_DEADLINE_MS) {
        finish('timeout');
        return;
      }
      try {
        context = gsap.context(() => {}, dialog);
        release = acquireScrollLock('intro');
        dialog.showModal();
        dialog.dataset.state = 'performing';
        skipRef.current?.focus({ preventScroll: true });
        state = advanceIntro(state, 'prepared', performance.now());
        onState(state.phase);
        originals.forEach((element) => { element.style.visibility = 'hidden'; });

        context.add(() => {
          const visualWords = Array.from(dialog.querySelectorAll<HTMLElement>('.intro__word'));
          if (visualWords.length !== originals.length) throw new Error('Intro destinations are unavailable');
          const fits = visualWords.map((word, index) => {
            if (!originals[index].getBoundingClientRect().width) throw new Error('Intro destination has no dimensions');
            return Flip.fit(word, originals[index], { scale: true, getVars: true }) as gsap.TweenVars;
          });
          const timeline = gsap.timeline({ defaults: { ease: 'power3.out' } });
          gsap.set(dialog.querySelectorAll('.intro__word-solid'), { opacity: 0 });
          gsap.set(dialog.querySelectorAll('.intro__echo'), { opacity: 0 });
          gsap.set(dialog.querySelector('.intro__sweep'), { scaleX: 0 });
          visualWords.forEach((word, wordIndex) => {
            const glyphs = word.querySelectorAll<HTMLElement>('.intro__glyph');
            timeline.fromTo(glyphs[0], { y: wordIndex ? 40 : -40, scaleX: 0.78, opacity: 0 }, { y: 0, scaleX: 1, opacity: 1, duration: 0.4 }, wordIndex * 0.06);
            timeline.fromTo(Array.from(glyphs).slice(1), {
              x: wordIndex ? 90 : -90,
              y: (index) => (index % 2 ? -22 : 22),
              scaleX: 0.74,
              rotation: wordIndex ? -5 : 5,
              opacity: 0,
            }, { x: 0, y: 0, scaleX: 1, rotation: 0, opacity: 1, duration: 0.52, stagger: 0.045 }, 0.28 + wordIndex * 0.06);
          });
          timeline.to(dialog.querySelector('.intro__sweep'), { scaleX: 1, duration: 0.36, ease: 'power3.inOut' }, 0.7);
          timeline.to(dialog.querySelector('.intro__sweep'), { xPercent: 110, duration: 0.52, ease: 'power3.inOut' }, 1.05);
          timeline.fromTo(dialog.querySelector('.intro__echo'), { xPercent: -3, opacity: 0 }, { xPercent: 0, opacity: 0.12, duration: 0.24 }, 0.7);
          timeline.to(dialog.querySelector('.intro__echo'), { opacity: 0, duration: 0.3 }, 1.1);
          timeline.to(dialog.querySelectorAll('.intro__word-solid'), { opacity: 1, duration: 0.12 }, 1.04);
          timeline.to(dialog.querySelectorAll('.intro__word-slices'), { opacity: 0, duration: 0.12 }, 1.04);
          timeline.call(() => {
            state = advanceIntro(state, 'dock', performance.now());
            dialog.dataset.state = state.phase;
            onState(state.phase);
            portrait.current?.resolve(true);
          }, [], 1.25);
          if (portraitElement.current) {
            timeline.fromTo(portraitElement.current, { clipPath: 'inset(0 0 100% 0)' }, { clipPath: 'inset(0 0 0% 0)', duration: 0.7 }, 1.3);
          }
          visualWords.forEach((word, index) => timeline.to(word, { ...fits[index], duration: 0.74, ease: 'power3.inOut' }, 1.4 + index * 0.045));
          timeline.to(dialog.querySelector('.intro__sheet'), { opacity: 0, duration: 0.4 }, 1.54);
          timeline.to(dialog.querySelector('.intro__caption'), { opacity: 0, duration: 0.15 }, 2.12);
          timeline.call(() => finish('finish'), [], INTRO_DURATION);
        });
      } catch {
        finish('error');
      }
    };

    const displayFont = document.fonts.load('500 32px "Overused Grotesk"', identity.name).then((faces) => faces.length > 0).catch(() => false);
    const preparation = new Promise<boolean>((resolve) => {
      preparationTimer = window.setTimeout(() => resolve(false), INTRO_PREPARE_MS);
    });
    Promise.race([displayFont, preparation]).then((fontReady) => {
      if (finished || disposed) return;
      window.clearTimeout(preparationTimer);
      if (!fontReady) finish('error');
      else startFrame = requestAnimationFrame(start);
    });

    return () => {
      disposed = true;
      finish('unmount');
      window.removeEventListener('resize', onResize);
      document.removeEventListener('visibilitychange', onHidden);
      dialog.removeEventListener('wheel', onScrollIntent);
      dialog.removeEventListener('touchmove', onScrollIntent);
      dialog.removeEventListener('keydown', onKey);
      finishRef.current = null;
    };
  }, [ready, reduced, documentVisible, replayId, acquireScrollLock, identity.name, destinations, onState, portrait, portraitElement]);

  return (
    <dialog ref={dialogRef} className="intro" data-intro="" aria-label={ui.introLabel} onCancel={(event) => { event.preventDefault(); finishRef.current?.('skip'); }}>
      <div className="intro__sheet" aria-hidden="true" />
      <div className="intro__toolbar">
        <span>{identity.name}</span>
        <button ref={skipRef} type="button" onClick={() => finishRef.current?.('skip')}>{ui.skipIntro}</button>
      </div>
      <div className="intro__performance" aria-hidden="true">
        <span className="intro__echo">{words[1]}</span>
        <span className="intro__sweep" />
        {words.map((word, index) => (
          <span className={`intro__word intro__word--${index === 0 ? 'first' : 'last'}`} key={word}>
            <span className="intro__word-solid">{word}</span>
            <span className="intro__word-slices">{Array.from(word).map((letter, letterIndex) => <span className="intro__glyph" key={letterIndex}>{letter}</span>)}</span>
          </span>
        ))}
      </div>
      <span className="intro__caption">{intro.eyebrow}</span>
    </dialog>
  );
}
