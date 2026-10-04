'use client';

import { useId, useRef } from 'react';
import { portfolioContent } from '@/content/portfolio';
import { MAX_INSPECTION_ZOOM, MIN_INSPECTION_ZOOM, type CarMode, type InspectionView } from '@/lib/car-camera';

interface CarInspectionControlsProps {
  mode: CarMode;
  zoomFactor: number;
  onInspect: () => void;
  onReturn: () => void;
  onView: (view: InspectionView) => void;
  onZoom: (direction: -1 | 1) => void;
}

export function CarInspectionControls({ mode, zoomFactor, onInspect, onReturn, onView, onZoom }: CarInspectionControlsProps) {
  const { ui } = portfolioContent;
  const controlsId = useId();
  const helpId = useId();
  const trigger = useRef<HTMLButtonElement>(null);
  const returnToGuide = () => {
    trigger.current?.focus({ preventScroll: true });
    onReturn();
  };
  const views = [
    ['front', ui.frontView],
    ['side', ui.sideView],
    ['rear', ui.rearView],
    ['reset', ui.resetView],
  ] as const;

  return (
    <div
      className="cars__controls"
      onKeyDown={(event) => {
        if (event.key !== 'Escape' || mode !== 'inspect') return;
        event.preventDefault();
        event.stopPropagation();
        returnToGuide();
      }}
    >
      <button
        ref={trigger}
        className="mono cars__control cars__mode-control"
        type="button"
        aria-controls={controlsId}
        aria-expanded={mode !== 'guided'}
        aria-disabled={mode === 'returning' || undefined}
        onClick={() => {
          if (mode === 'guided') onInspect();
          else if (mode === 'inspect') returnToGuide();
        }}
      >
        {mode === 'guided' ? ui.inspectCar : ui.guidedView}
      </button>
      <div id={controlsId} className="cars__inspection" hidden={mode === 'guided'}>
        <div className="cars__view-controls" role="group" aria-label={ui.inspectCar} aria-describedby={helpId}>
          {views.map(([view, label]) => (
            <button
              key={view}
              className="mono cars__control"
              type="button"
              disabled={mode !== 'inspect'}
              onClick={() => onView(view)}
            >
              {label}
            </button>
          ))}
          <button
            className="mono cars__control cars__zoom-control"
            type="button"
            aria-label={ui.zoomOut}
            title={ui.zoomOut}
            disabled={mode !== 'inspect' || zoomFactor <= MIN_INSPECTION_ZOOM}
            onClick={() => onZoom(-1)}
          >
            <span aria-hidden="true">−</span>
          </button>
          <button
            className="mono cars__control cars__zoom-control"
            type="button"
            aria-label={ui.zoomIn}
            title={ui.zoomIn}
            disabled={mode !== 'inspect' || zoomFactor >= MAX_INSPECTION_ZOOM}
            onClick={() => onZoom(1)}
          >
            <span aria-hidden="true">+</span>
          </button>
        </div>
        <p id={helpId} className="cars__inspect-help">{ui.inspectHelp}</p>
      </div>
    </div>
  );
}
