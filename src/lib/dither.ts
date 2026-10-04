/**
 * Pure, framework-independent helpers for the interactive dither portrait engine.
 *
 * Everything here is deterministic and side-effect free (no DOM, no Canvas, no
 * globals) so it can be unit-tested under plain `tsc` + `node` without a
 * browser, a test runner, or any new dependency.
 *
 * Coordinate convention used throughout (matching Canvas 2D):
 *   - x grows right, y grows down
 *   - a pixel index is y * width + x
 *   - grayscale channels are 0..255 (Uint8ClampedArray semantics)
 */

/* ------------------------------------------------------------------ */
/* Bayer 8x8 ordered-dither threshold matrix                          */
/* ------------------------------------------------------------------ */

/**
 * Normalized 8x8 Bayer matrix. Each entry is the threshold for that cell,
 * expressed as a value in [0, 1) that a normalized luminance must exceed to
 * become "on". The pattern is fixed and deterministic — identical inputs
 * always produce identical output.
 */
export const BAYER_8X8: readonly number[] = [
  0 / 64, 32 / 64, 8 / 64, 40 / 64, 2 / 64, 34 / 64, 10 / 64, 42 / 64,
  48 / 64, 16 / 64, 56 / 64, 24 / 64, 50 / 64, 18 / 64, 58 / 64, 26 / 64,
  12 / 64, 44 / 64, 4 / 64, 36 / 64, 14 / 64, 46 / 64, 6 / 64, 38 / 64,
  60 / 64, 28 / 64, 52 / 64, 20 / 64, 62 / 64, 30 / 64, 54 / 64, 22 / 64,
  3 / 64, 35 / 64, 11 / 64, 43 / 64, 1 / 64, 33 / 64, 9 / 64, 41 / 64,
  51 / 64, 19 / 64, 59 / 64, 27 / 64, 49 / 64, 17 / 64, 57 / 64, 25 / 64,
  15 / 64, 47 / 64, 7 / 64, 39 / 64, 13 / 64, 45 / 64, 5 / 64, 37 / 64,
  63 / 64, 31 / 64, 55 / 64, 23 / 64, 61 / 64, 29 / 64, 53 / 64, 21 / 64,
];

export const BAYER_SIZE = 8;

/* ------------------------------------------------------------------ */
/* Math / easing primitives                                           */
/* ------------------------------------------------------------------ */

/** Clamp a number into the inclusive [min, max] range. NaN-safe: NaN -> min. */
export function clamp(value: number, min: number, max: number): number {
  if (Number.isNaN(value)) return min;
  if (value < min) return min;
  if (value > max) return max;
  return value;
}

/** Smoothstep easing on a pre-clamped input in [0, 1]; monotonic, no overshoot. */
export function easeInOutCubic(t: number): number {
  const x = clamp(t, 0, 1);
  return x < 0.5 ? 4 * x * x * x : 1 - Math.pow(-2 * x + 2, 3) / 2;
}

/* ------------------------------------------------------------------ */
/* Grayscale conversion                                               */
/* ------------------------------------------------------------------ */

/**
 * Rec. 601 luma weights for standard grayscale conversion.
 * Exported so callers/tests can reason about the exact transform.
 */
export const LUMA = { r: 0.299, g: 0.587, b: 0.114 } as const;

/** Convert a single RGB triple (0..255) to a grayscale value (0..255). */
export function rgbToGray(r: number, g: number, b: number): number {
  return clamp(
    Math.round(LUMA.r * r + LUMA.g * g + LUMA.b * b),
    0,
    255,
  );
}

/**
 * Convert an RGBA pixel buffer to a grayscale buffer (one Uint8 per pixel).
 * Pure: the source array is never mutated; a fresh array is always returned.
 */
export function toGrayscale(
  src: Uint8ClampedArray | Uint8Array,
  width: number,
  height: number,
): Uint8Array {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('toGrayscale: width and height must be positive');
  }
  const expectedLength = width * height * 4;
  if (src.length !== expectedLength) {
    throw new RangeError(
      `toGrayscale: expected an RGBA buffer of length ${expectedLength}, got ${src.length}`,
    );
  }
  const out = new Uint8Array(width * height);
  for (let i = 0; i < width * height; i++) {
    const o = i * 4;
    out[i] = rgbToGray(src[o], src[o + 1], src[o + 2]);
  }
  return out;
}

/* ------------------------------------------------------------------ */
/* Ordered dithering                                                  */
/* ------------------------------------------------------------------ */

/**
 * Apply ordered (Bayer) thresholding to a grayscale buffer, writing 0 or 255
 * per pixel into `out`. Deterministic and non-mutating with respect to `gray`.
 *
 * @param gray  Source grayscale buffer, length === width * height, values 0..255.
 * @param out   Destination buffer, same length; values set to 0 (dark) or 255 (light).
 * @param width Canvas width in pixels.
 * @param height Canvas height in pixels.
 * @param bias  Global brightness offset in [0, 255]; shifts the whole image
 *              darker (<0) or lighter (>0). Useful for entrance/exit ramps.
 * @param thresholdScale Linear gain applied to the per-cell threshold delta,
 *              in [0, 1] (1 = full Bayer spread). Lower values flatten contrast
 *              toward a 50% mid pattern (the coarse "blocky" look at entrance).
 */
export function applyOrderedDither(
  gray: Uint8Array,
  out: Uint8Array,
  width: number,
  height: number,
  bias = 0,
  thresholdScale = 1,
): void {
  if (!Number.isInteger(width) || !Number.isInteger(height) || width <= 0 || height <= 0) {
    throw new RangeError('applyOrderedDither: width and height must be positive integers');
  }
  const len = width * height;
  if (gray.length !== len || out.length !== len) {
    throw new RangeError(
      `applyOrderedDither: expected buffers of length ${len} (${width}x${height}), got ${gray.length}/${out.length}`,
    );
  }

  const b = clamp(bias, -255, 255);
  // When thresholdScale < 1, push the cell threshold toward the midpoint (0.5)
  // so the field reads as coarse noise rather than fine detail.
  const tScale = clamp(thresholdScale, 0, 1);
  const half = 0.5;

  for (let y = 0; y < height; y++) {
    const rowBase = (y % BAYER_SIZE) * BAYER_SIZE;
    for (let x = 0; x < width; x++) {
      const i = y * width + x;
      const cell = BAYER_8X8[rowBase + (x % BAYER_SIZE)];
      const threshold = (cell - half) * tScale + half;
      // Bias adjusts luminance, so positive values lighten and negative values darken.
      const v = clamp(gray[i] + b, 0, 255) / 255;
      out[i] = v > threshold ? 255 : 0;
    }
  }
}

/* ------------------------------------------------------------------ */
/* Local pointer clarity field                                        */
/* ------------------------------------------------------------------ */

/**
 * Influence of the pointer at a given pixel, in [0, 1].
 *   1 at the pointer centre, falling to 0 at `radius` (smooth cosine falloff).
 * Pixels beyond `radius` are exactly 0 — so the field is spatially bounded and
 * never produces a constant global tint or random noise.
 *
 * If `px`/`py`/`radius` are invalid (NaN negative), returns 0 (fully calm).
 */
export function pointerInfluence(
  px: number,
  py: number,
  x: number,
  y: number,
  radius: number,
): number {
  if (!Number.isFinite(px) || !Number.isFinite(py) || radius <= 0) return 0;
  const dx = x - px;
  const dy = y - py;
  const dist = Math.sqrt(dx * dx + dy * dy);
  if (dist >= radius) return 0;
  const t = dist / radius; // 0 at centre -> 1 at edge
  // Smooth cosine falloff: 1 at centre, 0 at edge, c2-continuous.
  return 0.5 * (1 + Math.cos(Math.PI * t));
}

/**
 * Compose a final monochrome value (0..255) for a pixel given its dithered base
 * (0 or 255) and the local pointer influence. The pointer *lifts* contrast in a
 * restrained way: nearer the pointer the value is pushed harder toward full
 * black/white (less mid-gray ambiguity), and slightly brighter overall.
 *
 * @param base        Dithered base value (0 or 255).
 * @param influence   Pointer influence in [0, 1] (see pointerInfluence).
 * @param strength    How strongly the pointer reshapes the field, 0..1.
 * @param lift        Global brightness lift at the pointer centre, 0..~60.
 */
export function composePixel(
  base: number,
  influence: number,
  strength = 0.5,
  lift = 18,
): number {
  const inf = clamp(influence, 0, 1);
  if (inf <= 0) return base;
  const s = clamp(strength, 0, 1);
  const l = clamp(lift, 0, 80);

  // Increase distance from the midpoint, then apply a restrained local lift.
  // This never turns a black dither pixel into a large mid-gray patch.
  const value = clamp(base, 0, 255);
  const contrasted = 127.5 + (value - 127.5) * (1 + s * inf);
  return clamp(Math.round(contrasted + l * inf), 0, 255);
}

export interface DitherFieldOptions {
  bias?: number;
  thresholdScale?: number;
  pointerX?: number;
  pointerY?: number;
  pointerRadius?: number;
  pointerStrength?: number;
  pointerLift?: number;
}

function orderedValue(
  luminance: number,
  x: number,
  y: number,
  bias: number,
  thresholdScale: number,
): 0 | 255 {
  const rowBase = (y % BAYER_SIZE) * BAYER_SIZE;
  const cell = BAYER_8X8[rowBase + (x % BAYER_SIZE)];
  const threshold = (cell - 0.5) * thresholdScale + 0.5;
  const value = clamp(luminance + bias, 0, 255) / 255;
  return value > threshold ? 255 : 0;
}

/**
 * Write the complete dither field into a caller-owned output buffer.
 * Reusing the destination lets the Canvas engine avoid per-frame allocation.
 */
export function applyDitherField(
  gray: Uint8Array,
  out: Uint8Array,
  width: number,
  height: number,
  opts: DitherFieldOptions = {},
): void {
  const {
    bias = 0,
    thresholdScale = 1,
    pointerX = NaN,
    pointerY = NaN,
    pointerRadius = 0,
    pointerStrength = 0.5,
    pointerLift = 18,
  } = opts;

  applyOrderedDither(gray, out, width, height, bias, thresholdScale);

  const radius = Math.max(0, pointerRadius);
  const strength = clamp(pointerStrength, 0, 1);
  const lift = clamp(pointerLift, 0, 80);
  const hasPointer =
    Number.isFinite(pointerX) &&
    Number.isFinite(pointerY) &&
    radius > 0 &&
    strength > 0;

  if (!hasPointer) return;

  // Pixels outside this bounded square already contain the correct base dither.
  const minX = Math.max(0, Math.floor(pointerX - radius));
  const maxX = Math.min(width - 1, Math.ceil(pointerX + radius));
  const minY = Math.max(0, Math.floor(pointerY - radius));
  const maxY = Math.min(height - 1, Math.ceil(pointerY + radius));
  const b = clamp(bias, -255, 255);
  const tScale = clamp(thresholdScale, 0, 1);

  for (let y = minY; y <= maxY; y++) {
    for (let x = minX; x <= maxX; x++) {
      const influence = pointerInfluence(pointerX, pointerY, x, y, radius);
      if (influence <= 0) continue;

      const i = y * width + x;
      const localLuminance =
        127.5 +
        (gray[i] - 127.5) * (1 + strength * influence) +
        lift * influence;
      out[i] = orderedValue(localLuminance, x, y, b, tScale);
    }
  }
}

/**
 * High-level, single-call renderer for a grayscale buffer into a binary
 * monochrome Uint8 buffer (0/255), applying the full effect stack:
 * ordered dither + optional local pointer clarity field. Pure and deterministic;
 * allocates and returns a fresh output array.
 */
export function renderDitherField(
  gray: Uint8Array,
  width: number,
  height: number,
  opts: DitherFieldOptions = {},
): Uint8Array {
  const len = width * height;
  const out = new Uint8Array(len);
  applyDitherField(gray, out, width, height, opts);
  return out;
}

/** Resolve progress with the locked cubic-bezier(0.22, 1, 0.36, 1) curve. */
export function resolveEasing(progress: number): number {
  const x = clamp(progress, 0, 1);
  const sample = (t: number, p1: number, p2: number) => {
    const inverse = 1 - t;
    return 3 * inverse * inverse * t * p1 + 3 * inverse * t * t * p2 + t * t * t;
  };
  const derivative = (t: number, p1: number, p2: number) =>
    3 * (1 - t) * (1 - t) * p1 +
    6 * (1 - t) * t * (p2 - p1) +
    3 * t * t * (1 - p2);

  let t = x;
  for (let i = 0; i < 6; i++) {
    const slope = derivative(t, 0.22, 0.36);
    if (Math.abs(slope) < 1e-7) break;
    t = clamp(t - (sample(t, 0.22, 0.36) - x) / slope, 0, 1);
  }
  return clamp(sample(t, 1, 1), 0, 1);
}
