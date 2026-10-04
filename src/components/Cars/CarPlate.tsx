'use client';

import Image from 'next/image';
import { Component, Suspense, lazy, useCallback, useEffect, useId, useMemo, useRef, useState, type MutableRefObject, type ReactNode } from 'react';
import { CarInspectionControls } from './CarInspectionControls';
import type { ProgressSource } from './progress';
import { portfolioContent } from '@/content/portfolio';
import { clampInspectionZoom, nextCarMode, type CarMode, type InspectionCommand, type InspectionView } from '@/lib/car-camera';

// Three.js and the 4 MB model stay out of the initial bundle and only load
// once the plate is within 800px of the viewport, or explicitly requested.
const createCarScene = (retry: boolean) => lazy(async () => {
  const sceneModule = await import('./CarPlateScene');
  if (retry) sceneModule.retryFailedCarModel();
  return { default: sceneModule.CarPlateScene };
});

const MAX_RETRIES = 2;
const LOAD_TIMEOUT_MS = 20000;

type SceneState = 'poster' | 'loading' | 'ready' | 'error';
type DataConnection = EventTarget & { saveData?: boolean };

class CarSceneBoundary extends Component<{ children: ReactNode; onError: () => void }, { failed: boolean }> {
  state = { failed: false };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  componentDidCatch() {
    this.props.onError();
  }

  render() {
    return this.state.failed ? null : this.props.children;
  }
}

interface CarPlateProps {
  progress: ProgressSource;
  speedRef: MutableRefObject<number>;
  reduced: boolean;
  active: boolean;
  caption: string;
  onReadyChange: (ready: boolean) => void;
  onVisibilityChange: (visible: boolean) => void;
}

export function CarPlate({ progress, speedRef, reduced, active, caption, onReadyChange, onVisibilityChange }: CarPlateProps) {
  const { ui } = portfolioContent;
  const ref = useRef<HTMLElement>(null);
  const media = useRef<HTMLDivElement>(null);
  const captionId = useId();
  const [near, setNear] = useState(false);
  const [visible, setVisible] = useState(false);
  const [saveData, setSaveData] = useState(true);
  const [finePointer, setFinePointer] = useState(false);
  const [requested, setRequested] = useState(false);
  const [optedIn, setOptedIn] = useState(false);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  const [mode, setMode] = useState<CarMode>('guided');
  const [zoomFactor, setZoomFactor] = useState(1);
  const [command, setCommand] = useState<InspectionCommand | null>(null);
  const [posterFailed, setPosterFailed] = useState(false);
  const commandId = useRef(0);
  const attemptId = useRef(0);
  const failure = useRef(false);
  const focusAction = useRef(false);
  const CarPlateScene = useMemo(() => createCarScene(attempt > 0), [attempt]);
  const allowed = optedIn || (!reduced && !saveData);
  const sceneActive = active && visible && requested && allowed && !failed;
  const showScene = ready && allowed && !failed;
  const state: SceneState = failed ? 'error' : !requested || !allowed ? 'poster' : ready ? 'ready' : 'loading';

  const handleError = useCallback(() => {
    if (attemptId.current !== attempt || failure.current) return;
    failure.current = true;
    focusAction.current = !!ref.current?.contains(document.activeElement);
    speedRef.current = 0;
    setFailed(true);
    setReady(false);
    setMode((current) => nextCarMode(current, 'fallback'));
  }, [attempt, speedRef]);

  const handleReady = useCallback(() => {
    if (attemptId.current !== attempt || failure.current) return;
    setReady(true);
  }, [attempt]);

  const handleReturned = useCallback(() => {
    setMode((current) => nextCarMode(current, 'settled'));
  }, []);

  useEffect(() => {
    const element = media.current;
    if (!element || typeof IntersectionObserver === 'undefined') return;
    const nearby = new IntersectionObserver(([entry]) => {
      if (!entry.isIntersecting) return;
      setNear(true);
      nearby.disconnect();
    }, { rootMargin: '800px 0px' });
    const presence = new IntersectionObserver(([entry]) => {
      setVisible(entry.isIntersecting && entry.intersectionRatio > 0);
    });
    nearby.observe(element);
    presence.observe(element);
    return () => {
      nearby.disconnect();
      presence.disconnect();
    };
  }, []);

  useEffect(() => {
    const connection = (navigator as Navigator & { connection?: DataConnection }).connection;
    const update = () => setSaveData(connection?.saveData === true);
    update();
    connection?.addEventListener?.('change', update);
    return () => connection?.removeEventListener?.('change', update);
  }, []);

  useEffect(() => {
    const fine = window.matchMedia('(hover: hover) and (pointer: fine)');
    const coarse = window.matchMedia('(any-pointer: coarse)');
    const update = () => setFinePointer(fine.matches && !coarse.matches);
    update();
    fine.addEventListener('change', update);
    coarse.addEventListener('change', update);
    return () => {
      fine.removeEventListener('change', update);
      coarse.removeEventListener('change', update);
    };
  }, []);

  useEffect(() => {
    if (near && active && !reduced && !saveData && !requested && !failed) setRequested(true);
  }, [near, active, reduced, saveData, requested, failed]);

  useEffect(() => {
    onReadyChange(showScene);
    return () => onReadyChange(false);
  }, [showScene, onReadyChange]);

  useEffect(() => {
    onVisibilityChange(visible);
    return () => onVisibilityChange(false);
  }, [visible, onVisibilityChange]);

  useEffect(() => {
    if (!sceneActive || reduced || mode !== 'guided') speedRef.current = 0;
    return () => { speedRef.current = 0; };
  }, [sceneActive, reduced, mode, speedRef]);

  useEffect(() => {
    if (state !== 'loading' || !sceneActive) return;
    const timeout = window.setTimeout(handleError, LOAD_TIMEOUT_MS);
    return () => window.clearTimeout(timeout);
  }, [state, sceneActive, handleError]);

  useEffect(() => {
    if (!focusAction.current || (state !== 'ready' && state !== 'error')) return;
    focusAction.current = false;
    if (document.activeElement !== document.body && !ref.current?.contains(document.activeElement)) return;
    const action = ref.current?.querySelector<HTMLButtonElement>('button:not(:disabled)');
    (action ?? ref.current)?.focus({ preventScroll: true });
  }, [state]);

  useEffect(() => {
    if (allowed) return;
    setMode((current) => nextCarMode(current, 'fallback'));
    speedRef.current = 0;
  }, [allowed, speedRef]);

  const load = () => {
    if (state === 'loading') return;
    if (typeof IntersectionObserver === 'undefined') {
      handleError();
      return;
    }
    focusAction.current = true;
    setOptedIn(true);
    setRequested(true);
  };

  const retry = () => {
    if (!failure.current || attempt >= MAX_RETRIES) return;
    if (typeof IntersectionObserver === 'undefined') return;
    attemptId.current = attempt + 1;
    failure.current = false;
    focusAction.current = true;
    setAttempt(attempt + 1);
    setFailed(false);
    setReady(false);
    setOptedIn(true);
    setRequested(true);
    setZoomFactor(1);
    setCommand(null);
  };

  const inspect = () => {
    if (!showScene || !sceneActive) return;
    setOptedIn(true);
    setCommand(null);
    setZoomFactor(1);
    setMode((current) => nextCarMode(current, 'inspect'));
  };

  const selectView = (view: InspectionView) => {
    if (mode !== 'inspect') return;
    if (view === 'reset') setZoomFactor(1);
    setCommand({ id: ++commandId.current, view });
  };

  return (
    <figure
      ref={ref}
      className="cars__plate"
      tabIndex={-1}
      aria-labelledby={captionId}
      data-scene-state={state}
      data-car-mode={mode}
      data-car-pointer={finePointer ? 'fine' : 'coarse'}
      data-car-active={sceneActive ? 'true' : 'false'}
      data-car-reduced={reduced ? 'true' : 'false'}
    >
      <div ref={media} className="cars__media">
        <div className="cars__poster" aria-hidden={showScene}>
          {posterFailed ? <p className="mono cars__poster-label">{caption}</p> : (
            <Image
              src="/images/car-night.webp"
              alt={caption}
              fill
              unoptimized
              sizes="(max-width: 767px) 100vw, 70vw"
              onError={() => setPosterFailed(true)}
            />
          )}
        </div>
        <div className={`cars__canvas${showScene ? ' is-ready' : ''}`} aria-hidden="true">
          {requested && !failed ? (
            <CarSceneBoundary key={attempt} onError={handleError}>
              <Suspense fallback={null}>
                <CarPlateScene
                  progress={progress}
                  speedRef={speedRef}
                  reduced={reduced}
                  active={sceneActive}
                  mode={mode}
                  finePointer={finePointer}
                  zoomFactor={zoomFactor}
                  command={command}
                  onReady={handleReady}
                  onReturned={handleReturned}
                  onError={handleError}
                />
              </Suspense>
            </CarSceneBoundary>
          ) : null}
        </div>
      </div>
      <figcaption id={captionId} className="mono cars__caption">
        <span>{caption}</span>
        {ui.modelCredit !== caption ? <span className="cars__credit">{ui.modelCredit}</span> : null}
      </figcaption>
      {showScene ? (
        <CarInspectionControls
          mode={mode}
          zoomFactor={zoomFactor}
          onInspect={inspect}
          onReturn={() => setMode((current) => nextCarMode(current, 'return'))}
          onView={selectView}
          onZoom={(direction) => {
            if (mode === 'inspect') setZoomFactor((current) => clampInspectionZoom(current * (direction > 0 ? 1.18 : 1 / 1.18)));
          }}
        />
      ) : (
        <div className="cars__controls cars__fallback-controls">
          {state === 'error' ? attempt < MAX_RETRIES && typeof IntersectionObserver !== 'undefined' ? (
            <button className="mono cars__control" type="button" onClick={retry}>{ui.retryModel}</button>
          ) : null : (
            <button className="mono cars__control" type="button" disabled={state === 'loading'} onClick={load}>{ui.loadModel}</button>
          )}
        </div>
      )}
      <p className="mono cars__model-status" role="status" aria-atomic="true">
        {state === 'loading' ? ui.loadingModel : state === 'error' ? ui.modelUnavailable : null}
      </p>
    </figure>
  );
}
