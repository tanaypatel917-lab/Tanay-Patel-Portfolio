'use client';

import { useEffect, useLayoutEffect, useMemo, useRef, useState } from 'react';
import { CarPlate } from './CarPlate';
import { createProgressSource } from './progress';
import { Statement } from '@/components/Portfolio/Statement';
import { Reveal } from '@/components/shared/Reveal';
import { useSound } from '@/components/shared/SoundProvider';
import { portfolioContent } from '@/content/portfolio';
import { useEngineSound } from '@/hooks/useEngineSound';
import { useMotionPolicy } from '@/components/shared/MotionProvider';
import { ScrollTrigger } from '@/lib/motion';

/**
 * The night chapter. The page turns to ink here and stays that way to the end;
 * a sticky render of the car drives forward and the camera eases down from a
 * plan view to a rear three-quarter view while the three notes scroll past.
 */
export function CarsSection() {
  const { cars } = portfolioContent;
  const sectionRef = useRef<HTMLElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);
  const progress = useMemo(() => createProgressSource(0), []);
  const speedRef = useRef(0);
  const [inView, setInView] = useState(false);
  const [sceneReady, setSceneReady] = useState(false);
  const { reduced, documentVisible, locked } = useMotionPolicy();
  const { enabled } = useSound();
  const active = documentVisible && !locked;

  useEngineSound({ active: enabled && active && inView && sceneReady, speedRef });

  useEffect(() => {
    if (!active || !inView || !sceneReady) speedRef.current = 0;
  }, [active, inView, sceneReady]);

  useLayoutEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const headerHeight = () =>
      parseFloat(getComputedStyle(document.documentElement).getPropertyValue('--header-height')) || 64;
    const mobile = () => window.matchMedia('(max-width: 767px), (max-height: 650px)').matches;

    // Night starts at this chapter; the shared provider owns the header state.
    const drive = ScrollTrigger.create({
      trigger: stage,
      start: () => mobile() ? 'top 75%' : `top ${headerHeight() + 16}px`,
      end: () => mobile() ? 'top 15%' : `+=${Math.max(1, stage.offsetHeight - (stage.querySelector<HTMLElement>('.cars__plate')?.offsetHeight ?? 0))}`,
      invalidateOnRefresh: true,
      onUpdate: (self) => progress.set(self.progress),
      onRefresh: (self) => progress.set(self.progress),
    });
    progress.set(drive.progress);

    return () => drive.kill();
  }, [progress]);

  return (
    <section ref={sectionRef} id="cars" className="section cars night" aria-labelledby="cars-title" tabIndex={-1}>
      <div className="cars__intro">
        <Statement id="cars-title" text={cars.title} />
        <Reveal>
          <p className="cars__summary">{cars.summary}</p>
        </Reveal>
      </div>

      <div ref={stageRef} className="cars__stage">
        <CarPlate
          progress={progress}
          speedRef={speedRef}
          reduced={reduced}
          active={active}
          caption={cars.model}
          onReadyChange={setSceneReady}
          onVisibilityChange={setInView}
        />

        <ol className="cars__items">
          {cars.items.map((item) => (
            <Reveal key={item.id} as="li" className="cars__item">
              <p className="mono">{item.eyebrow}</p>
              <h3>{item.title}</h3>
              <p className="cars__item-summary">{item.summary}</p>
            </Reveal>
          ))}
        </ol>
      </div>
    </section>
  );
}
