'use client';

import { useLayoutEffect, useMemo, useRef, useState } from 'react';
import { InteractiveDitherPortrait, type DitherPortraitHandle } from '@/components/Landing/InteractiveDitherPortrait';
import { Emphasis } from './Emphasis';
import { IntroSequence } from './IntroSequence';
import { portfolioContent } from '@/content/portfolio';
import { gsap } from '@/lib/motion';
import { useMotion } from '@/components/shared/MotionProvider';
import type { IntroPhase } from '@/lib/intro';

/** Maximum portrait travel while leaving the hero. */
const PORTRAIT_TRAVEL = 16;
/** The print retains its identity as the reader moves into the work. */
const EXIT_DETAIL = 0.85;

/** The real name and purpose are present in the initial HTML. */
export function Hero() {
  const { identity, intro, contact, ui } = portfolioContent;
  const sectionRef = useRef<HTMLElement>(null);
  const firstWordRef = useRef<HTMLSpanElement>(null);
  const lastWordRef = useRef<HTMLSpanElement>(null);
  const portraitRef = useRef<DitherPortraitHandle>(null);
  const portraitElement = useRef<HTMLDivElement>(null);
  const detailRef = useRef(1);
  const [phase, setPhase] = useState<IntroPhase>('complete');
  const { ready, reduced, documentVisible, locked } = useMotion();
  const words = useMemo(() => {
    const [first, ...rest] = identity.name.split(' ');
    return [first, rest.join(' ')];
  }, [identity.name]);
  const destinations = useMemo(() => [firstWordRef, lastWordRef], []);

  useLayoutEffect(() => {
    const section = sectionRef.current;
    if (!section || !ready || reduced || locked || !documentVisible || phase !== 'complete') return;
    const portrait = portraitRef.current;

    // Hand the settled portrait to a separate scroll effect; the introduction
    // owns no scroll-driven transforms and cannot leave hidden name content.
    const media = gsap.matchMedia();
    media.add('(min-width: 768px)', () => {
      const detail = { value: 1 };
      // The portrait moves slightly as the reader leaves. The name and its
      // supporting copy remain readable rather than dispersing into noise.
      const timeline = gsap.timeline({
        defaults: { ease: 'none' },
        scrollTrigger: { trigger: section, start: 'top top', end: 'bottom top', scrub: true },
      });
      timeline.to(portraitElement.current, { y: -PORTRAIT_TRAVEL }, 0);
      timeline.to(detail, {
        value: EXIT_DETAIL,
        onUpdate: () => {
          detailRef.current = detail.value;
          portrait?.repaint();
        },
      }, 0);
    }, section);
    return () => {
      media.revert();
      detailRef.current = 1;
      portrait?.repaint();
    };
  }, [ready, reduced, locked, documentVisible, phase]);

  return (
    <section ref={sectionRef} id="top" className="hero" aria-labelledby="top-title" tabIndex={-1} data-intro-state={phase}>
      <div className="hero__meta">
        <p className="mono">{identity.role}</p>
        <p className="mono">{identity.location}</p>
      </div>

      <div className="hero__title-cell">
        <h1 id="top-title" className="hero__name" aria-label={identity.name}>
          <span className="hero__line"><span ref={firstWordRef} className="hero__line-inner">{words[0]}</span></span>
          <span className="hero__line"><span ref={lastWordRef} className="hero__line-inner">{words[1]}</span></span>
        </h1>
      </div>

      <div className="hero__statement">
        <div className="hero__body">
          <p className="hero__headline"><Emphasis text={intro.headline} /></p>
          <p className="hero__focus mono">{intro.eyebrow}</p>
        </div>
        <ul className="hero__links" role="list">
          <li><a className="text-link text-link--primary" href="#work">{ui.viewWork}<span aria-hidden="true">↘</span></a></li>
          {contact.links.map((link) => {
            const external = link.href.startsWith('http');
            return (
              <li key={link.label}>
                <a className="text-link" href={link.href} target={external ? '_blank' : undefined} rel={external ? 'noreferrer' : undefined}>
                  {link.label}<span aria-hidden="true">↗</span>
                </a>
              </li>
            );
          })}
        </ul>
      </div>

      <div ref={portraitElement} className="hero__portrait">
        <InteractiveDitherPortrait ref={portraitRef} src="/images/tanay-headshot.jpg" alt={`Portrait of ${identity.name}`} className="hero__portrait-frame" detailRef={detailRef} holdCoarse />
        <p className="hero__portrait-note mono">{identity.currentStatus}</p>
      </div>

      <IntroSequence words={words} destinations={destinations} portrait={portraitRef} portraitElement={portraitElement} onState={setPhase} />
    </section>
  );
}
