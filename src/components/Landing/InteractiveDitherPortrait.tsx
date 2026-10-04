'use client';

/**
 * InteractiveDitherPortrait
 * -------------------------
 * A self-contained, reusable Canvas-2D dither portrait engine.
 *
 * Design contract (see kanban task t_76b0a4fd):
 *  - Public API is `InteractiveDitherPortrait({ src, alt, className? })`.
 *  - All pure sampling/threshold logic lives in `@/lib/dither` and is
 *    independently tested. This file only owns rendering + frame scheduling.
 *  - RAF runs ONLY while something is actually changing (entrance ramp,
 *    pointer settling, or an explicit repaint request). It stops otherwise.
 *  - IntersectionObserver pauses all drawing while the portrait is offscreen.
 *  - Device pixel ratio and work resolution are both capped.
 *  - `prefers-reduced-motion: reduce` -> a single calm, final frame with no
 *    entrance / pointer animation.
 *  - Touch / no-hover devices get the resolved portrait without hover work.
 *  - A real image remains below the enhancement canvas, preserving meaningful
 *    alternative text and a no-JavaScript / Canvas-failure fallback.
 */

import NextImage from 'next/image';
import { forwardRef, useEffect, useImperativeHandle, useRef, type MutableRefObject } from 'react';
import { useReducedMotion } from '@/hooks/useReducedMotion';
import {
  applyDitherField,
  resolveEasing,
  clamp,
  type DitherFieldOptions,
} from '@/lib/dither';

export interface InteractiveDitherPortraitProps {
  /** Local image path (e.g. "/images/..."). Never hardcoded by this component. */
  src: string;
  /** Meaningful description used for the canvas accessible name. */
  alt: string;
  className?: string;
  /**
   * Paint the coarse first frame on decode and wait for `resolve()` instead of
   * running the entrance ramp immediately. Lets the intro sequence cue it.
   */
  holdCoarse?: boolean;
  /**
   * External detail multiplier in [0, 1] applied after the entrance: 1 is the
   * full print, lower values coarsen it again. Call `repaint()` after changing it.
   */
  detailRef?: MutableRefObject<number>;
  /** Fires once the source image has decoded (used by the loading counter). */
  onDecoded?: () => void;
}

export interface DitherPortraitHandle {
  /** Start the coarse-to-fine entrance, optionally restarting for an explicit replay. */
  resolve: (restart?: boolean) => void;
  /** Request one frame, e.g. after `detailRef` changed. */
  repaint: () => void;
  finish: () => void;
}

/* Tunables ------------------------------------------------------------ */
const MAX_DPR = 2; // cap device pixel ratio
const MAX_WORK = 720; // cap work while keeping facial detail readable
const ENTRANCE_MS = 1200; // coarse -> fine resolve window (1.0–1.4s target)
const ENTRANCE_BIAS_START = -34; // slight darken at the very start
const THRESHOLD_SCALE_START = 0.16; // coarse blocky field at start -> 1.0 fine
const POINTER_RADIUS_FRAC = 0.3; // fraction of min(cssW,cssH) for the local field
const POINTER_STRENGTH = 0.8; // how hard the local field pushes contrast (resolves detail)
const POINTER_LIFT = 0; // no brightness lift: on paper it would only erase ink
const POINTER_LERP = 0.16; // pointer position smoothing
const STRENGTH_LERP = 0.12; // pointer field fade in/out smoothing

type Pt = { x: number; y: number };

export const InteractiveDitherPortrait = forwardRef<DitherPortraitHandle, InteractiveDitherPortraitProps>(
  function InteractiveDitherPortrait({ src, alt, className, holdCoarse = false, detailRef, onDecoded }, handleRef) {
  const reduced = useReducedMotion();
  const holdCoarseRef = useRef(holdCoarse);
  holdCoarseRef.current = holdCoarse;
  const onDecodedRef = useRef(onDecoded);
  onDecodedRef.current = onDecoded;
  const resolvingRef = useRef(false); // entrance is running
  const resolveRequestedRef = useRef(false);
  const forcedFinalRef = useRef(false);

  const containerRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);

  // Engine state (all mutable refs -> no React re-renders from animation)
  const offscreenRef = useRef<HTMLCanvasElement | null>(null);
  const offscreenCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const visibleCtxRef = useRef<CanvasRenderingContext2D | null>(null);
  const imageRef = useRef<HTMLImageElement | null>(null);
  const grayRef = useRef<Uint8Array | null>(null);
  const outputRef = useRef<Uint8Array | null>(null);
  const imageDataRef = useRef<ImageData | null>(null);
  const grayDirtyRef = useRef(true);

  const sizeRef = useRef({ cssW: 0, cssH: 0, workW: 0, workH: 0, scaleX: 1 });
  const startRef = useRef<number>(-Infinity); // entrance start time
  const entranceDoneRef = useRef(false);

  const pointerPosRef = useRef<Pt>({ x: -1e6, y: -1e6 });
  const pointerTargetRef = useRef<Pt>({ x: -1e6, y: -1e6 });
  const pointerStrengthRef = useRef(0);
  const pointerTargetStrengthRef = useRef(0);
  const pointerRadiusRef = useRef(0);

  const rafRef = useRef(0);
  const frameRequestedRef = useRef(false);
  const ioVisibleRef = useRef(true);
  const pageVisibleRef = useRef(true);

  const roRef = useRef<ResizeObserver | null>(null);
  const ioRef = useRef<IntersectionObserver | null>(null);

  /* ---- pure helpers (defined per render, stable enough) ------------- */

  function computeWorkSize(cssW: number, cssH: number) {
    const dpr = Math.min(typeof window !== 'undefined' ? window.devicePixelRatio || 1 : 1, MAX_DPR);
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = Math.max(1, Math.round(cssW * dpr));
      canvas.height = Math.max(1, Math.round(cssH * dpr));
    }
    const scale = Math.min(1, MAX_WORK / Math.max(cssW, cssH || 1));
    const workW = Math.max(1, Math.round(cssW * scale));
    const workH = Math.max(1, Math.round(cssH * scale));
    sizeRef.current = { cssW, cssH, workW, workH, scaleX: workW / (cssW || 1) };
    pointerRadiusRef.current = Math.min(cssW, cssH) * POINTER_RADIUS_FRAC * (workW / (cssW || 1));

    // (Re)allocate the offscreen work canvas.
    let off = offscreenRef.current;
    if (!off) {
      off = document.createElement('canvas');
      offscreenRef.current = off;
    }
    off.width = workW;
    off.height = workH;
    offscreenCtxRef.current = off.getContext('2d', { willReadFrequently: true });
    visibleCtxRef.current = canvas?.getContext('2d') ?? null;
    outputRef.current = new Uint8Array(workW * workH);
    imageDataRef.current = offscreenCtxRef.current?.createImageData(workW, workH) ?? null;
    grayDirtyRef.current = true;
  }

  function ensureGrayscale() {
    const img = imageRef.current;
    const ctx = offscreenCtxRef.current;
    if (!img || !ctx || !grayDirtyRef.current) return;
    const { workW, workH } = sizeRef.current;

    // Intentional center "cover" crop that preserves the image aspect ratio.
    const iw = img.naturalWidth || img.width;
    const ih = img.naturalHeight || img.height;
    const targetRatio = workW / workH;
    const imgRatio = iw / ih;
    let sw: number, sh: number, sx: number, sy: number;
    if (imgRatio > targetRatio) {
      sh = ih;
      sw = ih * targetRatio;
      sx = (iw - sw) / 2;
      sy = 0;
    } else {
      sw = iw;
      sh = iw / targetRatio;
      sx = 0;
      sy = (ih - sh) / 2;
    }

    ctx.clearRect(0, 0, workW, workH);
    // Slightly lifted so the light wall resolves to bare paper while the face keeps its mid-tones.
    ctx.filter = 'grayscale(100%) contrast(1.18) brightness(1.06)';
    ctx.drawImage(img, sx, sy, sw, sh, 0, 0, workW, workH);
    ctx.filter = 'none';

    const imageData = ctx.getImageData(0, 0, workW, workH);
    const data = imageData.data;
    const gray = new Uint8Array(workW * workH);
    for (let i = 0; i < gray.length; i++) {
      const o = i * 4;
      // Rec.601 luma, matching @/lib/dither rgbToGray
      gray[i] = clamp(
        Math.round(0.299 * data[o] + 0.587 * data[o + 1] + 0.114 * data[o + 2]),
        0,
        255,
      );
    }
    grayRef.current = gray;
    grayDirtyRef.current = false;
  }

  function paintFinalFrame(opts: DitherFieldOptions) {
    const ctx = offscreenCtxRef.current;
    const canvas = canvasRef.current;
    const gray = grayRef.current;
    const out = outputRef.current;
    const imageData = imageDataRef.current;
    const visibleContext = visibleCtxRef.current;
    if (!ctx || !canvas || !gray || !out || !imageData || !visibleContext) return;
    const { workW, workH } = sizeRef.current;

    applyDitherField(gray, out, workW, workH, opts);

    // Light cells take the page colour so the print sits directly on the paper;
    // dark cells are ink. Values mirror --bg / --ink in globals.css.
    const d = imageData.data;
    for (let i = 0; i < out.length; i++) {
      const light = out[i] === 255;
      const o = i * 4;
      d[o] = light ? 243 : 17;
      d[o + 1] = light ? 243 : 17;
      d[o + 2] = light ? 241 : 17;
      d[o + 3] = 255;
    }
    ctx.putImageData(imageData, 0, 0);

    // Scale the pixelated work grid up to the visible canvas.
    visibleContext.imageSmoothingEnabled = false;
    visibleContext.clearRect(0, 0, canvas.width, canvas.height);
    visibleContext.drawImage(
      offscreenRef.current!,
      0,
      0,
      workW,
      workH,
      0,
      0,
      canvas.width,
      canvas.height,
    );
    canvas.style.opacity = '1';
  }

  function renderOnce() {
    ensureGrayscale();

    // Entrance progress. While the coarse frame is being held, time stands still at 0.
    let entranceEased = 1;
    if (!entranceDoneRef.current && !reduced) {
      const elapsed = resolvingRef.current ? performance.now() - startRef.current : 0;
      const t = clamp(elapsed / ENTRANCE_MS, 0, 1);
      entranceEased = resolveEasing(t);
      if (t >= 1) entranceDoneRef.current = true;
    }

    // External detail only applies once the entrance has finished.
    const detail = entranceDoneRef.current ? clamp(detailRef?.current ?? 1, 0, 1) : 1;
    const thresholdScale =
      THRESHOLD_SCALE_START + (1 - THRESHOLD_SCALE_START) * entranceEased * detail;
    const bias = ENTRANCE_BIAS_START * (1 - entranceEased);

    // Pointer smoothing.
    const pos = pointerPosRef.current;
    const target = pointerTargetRef.current;
    const sNow = pointerStrengthRef.current;
    const sTarget = pointerTargetStrengthRef.current;

    const posDX = target.x - pos.x;
    const posDY = target.y - pos.y;
    const posDist = Math.sqrt(posDX * posDX + posDY * posDY);
    if (posDist > 0.5) {
      pos.x += posDX * POINTER_LERP;
      pos.y += posDY * POINTER_LERP;
    } else {
      pos.x = target.x;
      pos.y = target.y;
    }
    const sDiff = sTarget - sNow;
    if (Math.abs(sDiff) > 0.01) {
      pointerStrengthRef.current = sNow + sDiff * STRENGTH_LERP;
    } else {
      pointerStrengthRef.current = sTarget;
    }

    const strengthLive = pointerStrengthRef.current;
    paintFinalFrame({
      bias,
      thresholdScale,
      pointerX: pos.x,
      pointerY: pos.y,
      pointerRadius: pointerRadiusRef.current,
      pointerStrength: strengthLive * POINTER_STRENGTH,
      pointerLift: POINTER_LIFT,
    });

    // Decide whether another frame is needed.
    const entranceStillGoing = !entranceDoneRef.current && !reduced && resolvingRef.current;
    const pointerStillGoing =
      strengthLive > 0.01 && (Math.abs(sTarget - strengthLive) > 0.01 || posDist > 0.5);
    const stillAnimating = entranceStillGoing || pointerStillGoing;

    if (stillAnimating) {
      startFrame();
    } else {
      frameRequestedRef.current = false;
    }
  }

  function startFrame() {
    if (frameRequestedRef.current) return;
    if (!ioVisibleRef.current) return; // paused offscreen
    if (!pageVisibleRef.current) return; // paused in a background tab
    frameRequestedRef.current = true;
    rafRef.current = requestAnimationFrame(() => {
      frameRequestedRef.current = false;
      renderOnce();
    });
  }

  /* ---- effects ----------------------------------------------------- */

  useEffect(() => {
    const container = containerRef.current;
    const canvas = canvasRef.current;
    if (!container || !canvas) return;

    // Load the image off the main render path.
    canvas.style.opacity = '0';
    imageRef.current = null;
    grayRef.current = null;
    pointerStrengthRef.current = 0;
    pointerTargetStrengthRef.current = 0;
    entranceDoneRef.current = reduced || forcedFinalRef.current;
    const img = new window.Image();
    img.decoding = 'async';
    let initialized = false;
    const initializeImage = () => {
      if (initialized) return;
      initialized = true;
      imageRef.current = img;
      computeWorkSize(container.clientWidth || 1, container.clientHeight || 1);
      entranceDoneRef.current = reduced || forcedFinalRef.current; // reduced motion or cancellation -> no entrance ramp
      onDecodedRef.current?.();
      if (reduced || forcedFinalRef.current) {
        // Single calm final frame, no pointer animation.
        pointerTargetStrengthRef.current = 0;
        pointerStrengthRef.current = 0;
        resolvingRef.current = false;
        renderOnce();
        entranceDoneRef.current = true;
        frameRequestedRef.current = false;
      } else if (holdCoarseRef.current && !resolveRequestedRef.current) {
        // Paint the coarse field once and wait for resolve().
        resolvingRef.current = false;
        startFrame();
      } else {
        // Either no hold was requested or resolve() was already cued before decode.
        resolvingRef.current = true;
        startRef.current = performance.now();
        startFrame();
      }
    };
    img.onload = initializeImage;
    img.onerror = () => {
      // Show the meaningful Next Image fallback beneath the canvas.
      entranceDoneRef.current = true;
      container.dataset.fallback = '';
    };
    // No 2D context (very old or locked-down browsers): fall back to the image.
    if (!canvas.getContext('2d')) container.dataset.fallback = '';
    img.src = src;
    if (img.complete && img.naturalWidth > 0) initializeImage();

    // ResizeObserver -> recompute work grid + request one repaint.
    const ro = new ResizeObserver(() => {
      computeWorkSize(container.clientWidth || 1, container.clientHeight || 1);
      if (imageRef.current && ioVisibleRef.current) renderOnce();
    });
    ro.observe(container);
    roRef.current = ro;

    // IntersectionObserver -> pause drawing while offscreen.
    const io = new IntersectionObserver(
      ([entry]) => {
        ioVisibleRef.current = entry.isIntersecting;
        if (entry.isIntersecting && imageRef.current) {
          startFrame();
        } else {
          // Stop any pending frame.
          if (rafRef.current) cancelAnimationFrame(rafRef.current);
          frameRequestedRef.current = false;
        }
      },
      { threshold: 0.01 },
    );
    io.observe(container);
    ioRef.current = io;

    pageVisibleRef.current = document.visibilityState === 'visible';
    const onVisibilityChange = () => {
      pageVisibleRef.current = document.visibilityState === 'visible';
      if (!pageVisibleRef.current) {
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        frameRequestedRef.current = false;
      } else if (ioVisibleRef.current && imageRef.current) {
        startFrame();
      }
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    // Pointer listeners (calm on touch; entirely bypassed for reduced motion).
    const mapPointer = (clientX: number, clientY: number): Pt | null => {
      const rect = container.getBoundingClientRect();
      if (
        clientX < rect.left ||
        clientX > rect.right ||
        clientY < rect.top ||
        clientY > rect.bottom
      ) {
        return null; // outside -> fade field out
      }
      const { scaleX } = sizeRef.current;
      return {
        x: (clientX - rect.left) * scaleX,
        y: (clientY - rect.top) * (sizeRef.current.workH / (rect.height || 1)),
      };
    };

    const onPointerMove = (e: PointerEvent) => {
      if (reduced || e.pointerType === 'touch') return;
      const p = mapPointer(e.clientX, e.clientY);
      if (p) {
        pointerTargetRef.current = p;
        if (pointerStrengthRef.current === 0) {
          pointerPosRef.current = { ...p };
        }
        pointerTargetStrengthRef.current = 1;
      } else {
        pointerTargetStrengthRef.current = 0;
      }
      startFrame();
    };
    const onPointerLeave = () => {
      pointerTargetStrengthRef.current = 0;
      startFrame();
    };

    const finePointer = window.matchMedia('(hover: hover) and (pointer: fine)');
    if (!reduced && finePointer.matches) {
      container.addEventListener('pointermove', onPointerMove, { passive: true });
      container.addEventListener('pointerleave', onPointerLeave);
    }

    // Initial sizing in case the container already has layout.
    computeWorkSize(container.clientWidth || 1, container.clientHeight || 1);

    return () => {
      ro.disconnect();
      io.disconnect();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      container.removeEventListener('pointermove', onPointerMove);
      container.removeEventListener('pointerleave', onPointerLeave);
      img.onload = null;
      img.onerror = null;
      frameRequestedRef.current = false;
      offscreenRef.current = null;
      offscreenCtxRef.current = null;
      visibleCtxRef.current = null;
      grayRef.current = null;
      outputRef.current = null;
      imageDataRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [src, reduced]);

  useImperativeHandle(
    handleRef,
    () => ({
      resolve(restart = false) {
        if (!restart && (resolvingRef.current || entranceDoneRef.current)) return;
        resolveRequestedRef.current = true;
        forcedFinalRef.current = false;
        resolvingRef.current = true;
        entranceDoneRef.current = reduced;
        startRef.current = performance.now();
        if (imageRef.current) startFrame();
      },
      repaint() {
        if (imageRef.current) startFrame();
      },
      finish() {
        forcedFinalRef.current = true;
        resolveRequestedRef.current = false;
        entranceDoneRef.current = true;
        resolvingRef.current = false;
        pointerTargetStrengthRef.current = 0;
        pointerStrengthRef.current = 0;
        if (detailRef) detailRef.current = 1;
        if (rafRef.current) cancelAnimationFrame(rafRef.current);
        frameRequestedRef.current = false;
        if (imageRef.current) renderOnce();
      },
    }),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [reduced],
  );

  return (
    <div ref={containerRef} className={className} style={{ position: 'relative' }}>
      <NextImage
        src={src}
        alt={alt}
        fill
        priority
        sizes="(max-width: 767px) 100vw, (max-width: 1199px) 38vw, 34vw"
        className="dither-fallback"
      />
      <canvas
        ref={canvasRef}
        aria-hidden="true"
        className="dither-canvas"
      />
    </div>
  );
});
