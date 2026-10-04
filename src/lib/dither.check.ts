/**
 * Executable verification for the pure dither helpers in `dither.ts`.
 *
 * This is intentionally dependency-free: it compiles with the project's own
 * `tsc` and runs under `node`. Run it with:
 *   npx tsc src/lib/dither.ts src/lib/dither.check.ts --outDir .tmp-check --module esnext --target es2020 --moduleResolution bundler && node .tmp-check/dither.check.js
 *
 * It asserts:
 *  - determinism: identical inputs -> identical outputs (no randomness / clock / global state)
 *  - bounds: all outputs within [0,255]; entrance thresholdScale in (0,1) coarse, 1 fine
 *  - non-mutation: source buffers are never mutated
 *  - reduced-motion analogue (thresholdScale=1, no pointer) matches a plain ordered dither
 */

import {
  BAYER_8X8,
  BAYER_SIZE,
  applyOrderedDither,
  toGrayscale,
  rgbToGray,
  pointerInfluence,
  composePixel,
  applyDitherField,
  renderDitherField,
  easeInOutCubic,
  resolveEasing,
  clamp,
} from './dither';

let failures = 0;
function assert(cond: boolean, msg: string) {
  if (!cond) {
    failures++;
    console.error('  FAIL:', msg);
  } else {
    console.log('  ok  :', msg);
  }
}

function makeGray(w: number, h: number, fill: number): Uint8Array {
  const a = new Uint8Array(w * h);
  a.fill(fill);
  return a;
}

console.log('dither helper checks');

/* 1. Bayer matrix shape + range ------------------------------------- */
assert(BAYER_8X8.length === BAYER_SIZE * BAYER_SIZE, 'bayer matrix is 8x8');
assert(
  BAYER_8X8.every((v) => v >= 0 && v < 1),
  'bayer entries are in [0,1)',
);

/* 2. determinism ---------------------------------------------------- */
const W = 16;
const H = 16;
const src = makeGray(W, H, 128);
const a = new Uint8Array(W * H);
const b = new Uint8Array(W * H);
applyOrderedDither(src, a, W, H, 0, 1);
applyOrderedDither(src, b, W, H, 0, 1);
assert(
  a.every((v, i) => v === b[i]),
  'applyOrderedDither is deterministic for identical inputs',
);

/* 3. bounds --------------------------------------------------------- */
assert(a.every((v) => v === 0 || v === 255), 'dither output is binary 0/255');
const out2 = renderDitherField(makeGray(20, 12, 200), 20, 12, {});
assert(out2.every((v) => v === 0 || v === 255), 'renderDitherField output binary');
assert(
  out2.every((v) => v >= 0 && v <= 255),
  'renderDitherField within byte bounds',
);

/* 4. non-mutation --------------------------------------------------- */
const original = makeGray(W, H, 73);
const snapshot = Uint8Array.from(original);
const sink = new Uint8Array(W * H);
applyOrderedDither(original, sink, W, H, 0, 1);
assert(
  original.every((v, i) => v === snapshot[i]),
  'applyOrderedDither does not mutate the source grayscale buffer',
);

/* 5. toGrayscale non-mutation + length ------------------------------ */
const rgba = new Uint8ClampedArray([200, 100, 50, 255, 10, 20, 30, 255]);
const rgbaSnap = Uint8ClampedArray.from(rgba);
const gray = toGrayscale(rgba, 2, 1);
assert(gray.length === 2, 'toGrayscale length matches pixel count');
assert(
  rgba.every((v, i) => v === rgbaSnap[i]),
  'toGrayscale does not mutate source',
);
// pixel 0 = 0.299*200 + 0.587*100 + 0.114*50 = 59.8+58.7+5.7 = 124.2 -> 124
assert(gray[0] === rgbToGray(200, 100, 50), 'rgbToGray matches manual expectation');

/* 6. entrance ramps: coarse (scale<1) vs fine (scale=1) ------------ */
const rampSrc = makeGray(W, H, 96);
const coarse = new Uint8Array(W * H);
const fine = new Uint8Array(W * H);
applyOrderedDither(rampSrc, coarse, W, H, 0, 0.16); // entrance start
applyOrderedDither(rampSrc, fine, W, H, 0, 1); // entrance end
// Away from exact midpoint, a coarse thresholdScale compresses thresholds near
// 0.5, so the field differs from the fully resolved fine field.
assert(
  coarse.some((v, i) => v !== fine[i]),
  'coarse thresholdScale differs from fine (entrance resolvable)',
);
// A fully black source must stay fully black at every scale (no noise injection).
const black = makeGray(W, H, 0);
const blackOut = new Uint8Array(W * H);
applyOrderedDither(black, blackOut, W, H, 0, 0.16);
assert(
  blackOut.every((v) => v === 0),
  'pure black source stays black (no random coarse noise)',
);

/* 7. pointer field is spatially bounded + restrained --------------- */
// At the pointer centre we expect a stronger "on" tendency; far away influence=0.
const infCenter = pointerInfluence(5, 5, 5, 5, 10);
const infFar = pointerInfluence(5, 5, 100, 100, 10);
assert(infCenter > 0.99, 'pointer influence ~1 at centre');
assert(infFar === 0, 'pointer influence exactly 0 beyond radius');
const composed = composePixel(0, infCenter, 0.5, 16);
assert(composed >= 0 && composed <= 255, 'composePixel stays in bounds');
assert(composed === 0, 'composePixel preserves full black under a contrast field');

const pointerGray = Uint8Array.from({ length: 16 * 16 }, (_, i) => (i % 16) * 16);
const pointerBase = renderDitherField(pointerGray, 16, 16);
const pointerField = new Uint8Array(16 * 16);
applyDitherField(pointerGray, pointerField, 16, 16, {
  pointerX: 8,
  pointerY: 8,
  pointerRadius: 6,
  pointerStrength: 0.55,
  pointerLift: 16,
});
assert(
  pointerField.some((v, i) => v !== pointerBase[i]),
  'pointer field locally changes the resolved dither',
);
assert(
  pointerField.every((v) => v === 0 || v === 255),
  'pointer field remains binary 0/255',
);

/* 8. reduced-motion analogue: scale=1 + no pointer = plain dither --- */
const rmSrc = makeGray(8, 8, 128);
const rmA = new Uint8Array(64);
const rmB = new Uint8Array(64);
applyOrderedDither(rmSrc, rmA, 8, 8, 0, 1);
const rmField = renderDitherField(rmSrc, 8, 8, {}); // scale 1, no pointer
assert(rmField.every((v, i) => v === rmA[i]), 'reduced-motion render == plain dither (no extra animation)');

/* 9. easing sanity -------------------------------------------------- */
assert(easeInOutCubic(0) === 0, 'ease start = 0');
assert(Math.abs(easeInOutCubic(1) - 1) < 1e-9, 'ease end = 1');
assert(easeInOutCubic(0.5) === 0.5, 'ease midpoint = 0.5');
assert(resolveEasing(0) === 0, 'resolve easing start = 0');
assert(Math.abs(resolveEasing(1) - 1) < 1e-9, 'resolve easing end = 1');
assert(resolveEasing(0.5) > 0.5, 'resolve easing follows the fast locked ease-out curve');
assert(clamp(300, 0, 255) === 255, 'clamp upper');
assert(clamp(-5, 0, 255) === 0, 'clamp lower');

console.log(failures === 0 ? '\nALL CHECKS PASSED' : `\n${failures} CHECK(S) FAILED`);
if (failures > 0) process.exit(1);
