'use client';

import { useEffect, useRef } from 'react';
import { useMotionPolicy } from '@/components/shared/MotionProvider';
import { EASE_OUT, gsap } from '@/lib/motion';

interface ProjectPosterPanel {
  readonly label: string;
  readonly text: string;
}

interface ProjectPosterProps {
  title: string;
  tone: 'accent' | 'ink';
  panels?: readonly ProjectPosterPanel[];
}

const EMPTY_PANELS: readonly ProjectPosterPanel[] = [];
const OPEN_OFFSET = 18; // px

/**
 * Typographic cover for a project that has no imagery: a single title and
 * a fold-out of supplied facts, rather than a reproduction of project artifacts.
 * The paper planes separate once on entry; their text stays visible throughout.
 * There is no hover-only content or continuing loop. The cover title is
 * decorative; the real project heading is rendered beside it.
 */
export function ProjectPoster({ title, tone, panels = EMPTY_PANELS }: ProjectPosterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const playedRef = useRef(false);
  const { reduced, documentVisible, locked } = useMotionPolicy();

  useEffect(() => {
    const dossier = ref.current;
    if (!dossier || reduced || !documentVisible || locked || playedRef.current || !panels.length) return;
    if (typeof IntersectionObserver === 'undefined') return;

    let disposed = false;
    let tween: gsap.core.Tween | null = null;
    const ctx = gsap.context(() => {}, dossier);
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (disposed || !entry?.isIntersecting) return;
        playedRef.current = true;
        observer.disconnect();
        try {
          ctx.add(() => {
            tween = gsap.fromTo(
              dossier.querySelectorAll('.work-dossier__panel'),
              { y: -OPEN_OFFSET, rotationY: -8, transformOrigin: 'left top' },
              {
                y: 0,
                rotationY: 0,
                duration: 0.75,
                stagger: 0.09,
                ease: EASE_OUT,
                clearProps: 'transform,transformOrigin',
              },
            );
          });
        } catch {
          tween?.kill();
          ctx.revert();
        }
      },
      { threshold: 0.15 },
    );
    observer.observe(dossier);

    return () => {
      disposed = true;
      observer.disconnect();
      tween?.kill();
      ctx.revert();
    };
  }, [reduced, documentVisible, locked, panels.length]);

  const lastWord = title.lastIndexOf(' ') + 1;

  return (
    <div ref={ref} className={`work-dossier work-dossier--${tone}`}>
      <div className="work-dossier__cover" aria-hidden="true">
        <p className="work-dossier__title">
          {title.slice(0, lastWord)}
          <span className="work-dossier__title-end">{title.slice(lastWord)}</span>
        </p>
      </div>
      {panels.length > 0 ? (
        <dl className="work-dossier__planes">
          {panels.map((panel, index) => (
            <div key={`${panel.label}-${index}`} className="work-dossier__panel">
              <dt className="work-dossier__label">
                <span className="work-dossier__index" aria-hidden="true">
                  {String(index + 1).padStart(2, '0')}
                </span>
                {panel.label}
              </dt>
              <dd className="work-dossier__fact">{panel.text}</dd>
            </div>
          ))}
        </dl>
      ) : null}
    </div>
  );
}
