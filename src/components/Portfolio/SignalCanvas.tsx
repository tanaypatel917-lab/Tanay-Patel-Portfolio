'use client';

import { useEffect, useRef } from 'react';
import { useMotionPolicy } from '@/components/shared/MotionProvider';
import { ScrollTrigger, gsap } from '@/lib/motion';

const MAX_DPR = 1.5;
const FIELD_WIDTH = 960; // unitless width of the illustrative field
const CYCLES_ACROSS = 4; // unitless; no measured rate is displayed anywhere
const AMPLITUDE = 0.24; // fraction of the height
const FIELD_HEIGHT = 400;
const SAMPLES = 480;
const TAU = Math.PI * 2;

/** Clamp a finite value to the illustrative 0..1 phase. */
function clampPhase(value: number) {
  return Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : 1;
}

/** A smooth periodic wave, not a physiological waveform or measured rate. */
function periodicWave(x: number) {
  return 0.72 * Math.sin(TAU * CYCLES_ACROSS * x) + 0.08 * Math.sin(TAU * CYCLES_ACROSS * 2 * x + 0.3);
}

/** Illustrative interference: three higher-frequency sines. */
function interference(x: number) {
  return (
    0.52 * Math.sin(TAU * 19 * x + 0.3) +
    0.3 * Math.sin(TAU * 37 * x - 0.5) +
    0.18 * Math.sin(TAU * 61 * x + 0.9)
  );
}

function sampleSignal(x: number, phase: number) {
  return 0.5 - AMPLITUDE * periodicWave(x) - 0.18 * interference(x) * (1 - clampPhase(phase));
}

function signalPath(phase: number) {
  return Array.from({ length: SAMPLES + 1 }, (_, index) => {
    const x = index / SAMPLES;
    return `${index === 0 ? 'M' : 'L'}${(x * FIELD_WIDTH).toFixed(2)},${(sampleSignal(x, phase) * FIELD_HEIGHT).toFixed(2)}`;
  }).join(' ');
}

const REFERENCE_PATH = signalPath(0);
const SETTLED_PATH = signalPath(1);

interface SignalCanvasProps {
  className?: string;
}

/**
 * Periodic signal illustration for "Heartbeat sensing through Wi-Fi": the
 * interference resolves through a finite scroll phase, then the field rests.
 * SVG and canvas use the same illustrative math, with no sensor values.
 * The SVG remains visible until the canvas has successfully painted.
 */
export function SignalCanvas({ className }: SignalCanvasProps) {
  const wrapRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const phaseRef = useRef(0);
  const { reduced, documentVisible, locked } = useMotionPolicy();

  useEffect(() => {
    const wrap = wrapRef.current;
    const canvas = canvasRef.current;
    if (!wrap || !canvas) return;
    if (reduced) {
      phaseRef.current = 1;
      return;
    }
    if (!documentVisible || locked) return;
    if (typeof IntersectionObserver === 'undefined' || typeof ResizeObserver === 'undefined') return;

    let drawingContext: CanvasRenderingContext2D | null;
    try {
      drawingContext = canvas.getContext('2d');
    } catch {
      return;
    }
    if (!drawingContext) return;

    const ctx2d = drawingContext;
    const paper = getComputedStyle(wrap).color || '#f3f3f1';
    const ctx = gsap.context(() => {}, wrap);
    let trigger: ScrollTrigger | null = null;
    let resizeObserver: ResizeObserver | null = null;
    let intersectionObserver: IntersectionObserver | null = null;
    let inViewport = false;
    let disposed = false;
    let painted = false;
    let frame = 0;
    let width = 0;
    let height = 0;
    let dpr = 1;

    const stopFrame = () => {
      if (frame) cancelAnimationFrame(frame);
      frame = 0;
    };

    const onContextLost = () => cleanup();

    const cleanup = () => {
      if (disposed) return;
      disposed = true;
      stopFrame();
      intersectionObserver?.disconnect();
      resizeObserver?.disconnect();
      canvas.removeEventListener('contextlost', onContextLost);
      if (painted) phaseRef.current = 1;
      delete wrap.dataset.signalPainted;
      canvas.width = 0;
      canvas.height = 0;
      trigger?.kill();
      ctx.revert();
    };

    const active = () => !disposed && inViewport && documentVisible && !locked && !reduced;

    const drawTrace = (phase: number, alpha: number, lineWidth: number) => {
      ctx2d.globalAlpha = alpha;
      ctx2d.lineWidth = lineWidth;
      ctx2d.beginPath();
      for (let index = 0; index <= SAMPLES; index += 1) {
        const x = index / SAMPLES;
        const y = sampleSignal(x, phase) * height;
        if (index === 0) ctx2d.moveTo(x * width, y);
        else ctx2d.lineTo(x * width, y);
      }
      ctx2d.stroke();
    };

    const paint = () => {
      frame = 0;
      if (!active() || width <= 0 || height <= 0) return;
      try {
        const pixelWidth = Math.max(1, Math.round(width * dpr));
        const pixelHeight = Math.max(1, Math.round(height * dpr));
        if (canvas.width !== pixelWidth || canvas.height !== pixelHeight) {
          canvas.width = pixelWidth;
          canvas.height = pixelHeight;
        }
        ctx2d.setTransform(dpr, 0, 0, dpr, 0, 0);
        ctx2d.clearRect(0, 0, width, height);
        ctx2d.strokeStyle = paper;
        ctx2d.lineJoin = 'round';
        ctx2d.lineCap = 'round';

        // Reference rules: layout guides, not a measurement scale.
        ctx2d.globalAlpha = 0.12;
        ctx2d.lineWidth = 1;
        ctx2d.beginPath();
        [0.25, 0.5, 0.75].forEach((position) => {
          ctx2d.moveTo(0, height * position);
          ctx2d.lineTo(width, height * position);
        });
        ctx2d.stroke();

        drawTrace(0, 0.24, 1);
        drawTrace(phaseRef.current, 0.96, 1.75);
        ctx2d.globalAlpha = 1;
        painted = true;
        wrap.dataset.signalPainted = 'true';
      } catch {
        cleanup();
      }
    };

    const requestPaint = () => {
      if (active() && !frame) frame = requestAnimationFrame(paint);
    };

    const resize = () => {
      const nextWidth = wrap.clientWidth;
      const nextHeight = wrap.clientHeight;
      const nextDpr = Math.min(window.devicePixelRatio || 1, MAX_DPR);
      if (width === nextWidth && height === nextHeight && dpr === nextDpr) return;
      width = nextWidth;
      height = nextHeight;
      dpr = nextDpr;
      requestPaint();
    };

    const updatePhase = (progress: number) => {
      const next = Math.max(phaseRef.current, clampPhase(progress));
      if (next === phaseRef.current || (next < 1 && next - phaseRef.current < 1 / 180)) return;
      phaseRef.current = next;
      requestPaint();
    };

    try {
      canvas.addEventListener('contextlost', onContextLost);
      resizeObserver = new ResizeObserver(resize);
      intersectionObserver = new IntersectionObserver(
        ([entry]) => {
          if (disposed) return;
          inViewport = Boolean(entry?.isIntersecting);
          if (!inViewport) {
            stopFrame();
            return;
          }
          if (trigger) updatePhase(trigger.progress);
          requestPaint();
        },
        { threshold: 0.01 },
      );

      // The trace resolves once as the field travels from the edge to the centre.
      ctx.add(() => {
        if (phaseRef.current >= 1) return;
        trigger = ScrollTrigger.create({
          trigger: wrap,
          start: 'top 90%',
          end: 'center 55%',
          once: true,
          onUpdate: (self) => {
            updatePhase(self.progress);
            if (self.progress >= 1) self.kill();
          },
        });
        updatePhase(trigger.progress);
      });

      resize();
      resizeObserver.observe(wrap);
      intersectionObserver.observe(wrap);
    } catch {
      cleanup();
    }

    return cleanup;
  }, [reduced, documentVisible, locked]);

  return (
    <div ref={wrapRef} className={className ? `work-signal ${className}` : 'work-signal'} aria-hidden="true">
      <svg
        className="work-signal__fallback"
        viewBox={`0 0 ${FIELD_WIDTH} ${FIELD_HEIGHT}`}
        preserveAspectRatio="none"
        fill="none"
        stroke="currentColor"
        strokeLinecap="round"
        strokeLinejoin="round"
        focusable="false"
      >
        <path
          className="work-signal__guides"
          d={`M0,${FIELD_HEIGHT * 0.25}H${FIELD_WIDTH} M0,${FIELD_HEIGHT * 0.5}H${FIELD_WIDTH} M0,${FIELD_HEIGHT * 0.75}H${FIELD_WIDTH}`}
          vectorEffect="non-scaling-stroke"
        />
        <path className="work-signal__reference" d={REFERENCE_PATH} vectorEffect="non-scaling-stroke" />
        <path className="work-signal__trace" d={SETTLED_PATH} vectorEffect="non-scaling-stroke" />
      </svg>
      <canvas ref={canvasRef} className="work-signal__canvas" />
    </div>
  );
}
