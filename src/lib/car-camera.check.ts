import {
  MAX_INSPECTION_ZOOM,
  MIN_INSPECTION_ZOOM,
  RETURN_SECONDS,
  blendCameraFrames,
  boundsCorners,
  cameraBasis,
  clampInspectionZoom,
  clampProgress,
  fitOrthographic,
  framingPoints,
  guidedFrame,
  guidedPose,
  inspectionFrame,
  nextCarMode,
  orbitPosition,
  returningFrame,
  type CameraFrame,
  type CarBounds,
  type Vec3,
} from './car-camera';
import { createProgressSource } from '../components/Cars/progress';

let failures = 0;
let checks = 0;
function assert(condition: boolean, message: string) {
  checks++;
  if (!condition) {
    failures++;
    console.error('FAIL:', message);
  }
}
const close = (a: number, b: number) => Math.abs(a - b) < 1e-7;
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const finiteFrame = (frame: CameraFrame) => [...frame.position, ...frame.target, frame.zoom, frame.carZ].every(Number.isFinite) && frame.zoom > 0;
const bounds: CarBounds = { min: [-1.32, 0.07, -2.63], max: [1.07, 1.39, 2.27] };
const viewport = { width: 940, height: 560 };

assert(clampProgress(-4) === 0 && clampProgress(8) === 1, 'progress clamps its finite range');
assert(clampProgress(NaN) === 0 && clampProgress(Infinity, 0.4) === 0.4, 'non-finite progress uses a finite fallback');
assert(clampProgress(NaN, NaN) === 0, 'non-finite fallback is safe');
assert(guidedPose(0).elevation === 88 && guidedPose(0).azimuth === 0, 'near-top pose avoids the pole');
assert(guidedPose(0.5).elevation === 64 && guidedPose(0.5).azimuth === -25, 'middle pose exposes three-quarter form');
assert(guidedPose(1).elevation === 48 && guidedPose(1).azimuth === -55, 'final pose has a distinct stance');
assert(JSON.stringify(guidedPose(0.1, true)) === JSON.stringify(guidedPose(0.9, true)), 'reduced motion ignores scroll');
assert(guidedPose(0, true).carZ === 0, 'reduced motion has no automatic translation');

for (const progress of [-Infinity, -1, 0, 0.05, 0.25, 0.5, 0.75, 0.99, 1, 8, Infinity, NaN]) {
  for (const size of [{ width: 320, height: 480 }, { width: 1440, height: 640 }, { width: 320, height: 180 }, { width: 768, height: 460 }]) {
    const frame = guidedFrame(bounds, size, progress);
    assert(finiteFrame(frame), `finite guided frame at ${progress} / ${size.width}`);
    const basis = cameraBasis(frame.position, frame.target);
    assert(close(Math.hypot(...basis.up), 1) && close(Math.hypot(...basis.right), 1), 'camera basis has unit axes');
    assert(close(dot(basis.up, basis.right), 0) && close(dot(basis.up, basis.back), 0), 'camera basis is orthogonal');
    for (const corner of framingPoints(bounds, frame.carZ)) {
      const offset: Vec3 = [corner[0] - frame.target[0], corner[1] - frame.target[1], corner[2] - frame.target[2]];
      assert(Math.abs(dot(offset, basis.right)) * frame.zoom <= size.width / (2 * 1.14) + 1e-7, 'all body/beam corners fit horizontally with margin');
      assert(Math.abs(dot(offset, basis.up)) * frame.zoom <= size.height / (2 * 1.14) + 1e-7, 'all body/beam corners fit vertically with margin');
    }
  }
}

const angle = 0.71;
const transformed = boundsCorners(bounds).map(([x, y, z]): Vec3 => [
  x * Math.cos(angle) - z * Math.sin(angle) + 8,
  y + 0.7,
  x * Math.sin(angle) + z * Math.cos(angle) - 3,
]);
const target: Vec3 = [8, 1.2, -3];
const position = orbitPosition(33, -112, target);
const zoom = fitOrthographic(transformed, position, target, viewport);
const basis = cameraBasis(position, target);
assert(transformed.length === 8, 'transformed bounds preserve all eight corners');
for (const corner of transformed) {
  const offset: Vec3 = [corner[0] - target[0], corner[1] - target[1], corner[2] - target[2]];
  assert(Math.abs(dot(offset, basis.right)) * zoom <= viewport.width / (2 * 1.14) + 1e-7, 'non-axis-aligned bounds fit width');
  assert(Math.abs(dot(offset, basis.up)) * zoom <= viewport.height / (2 * 1.14) + 1e-7, 'non-axis-aligned bounds fit height');
}
assert(Number.isFinite(fitOrthographic([], [0, 20, 0], [0, 0, 0], { width: 0, height: NaN })), 'empty bounds, zero size and a top view remain finite');
assert(Math.abs(orbitPosition(90, 0, [0, 0, 0])[2]) > 0, 'requested exactly-top view is kept away from singularity');

for (const value of [-10, 0, 0.9, 1, 2, NaN, Infinity]) {
  const factor = clampInspectionZoom(value);
  assert(factor >= MIN_INSPECTION_ZOOM && factor <= MAX_INSPECTION_ZOOM, 'inspection zoom is finite and bounded');
}
for (const view of ['front', 'side', 'rear', 'reset'] as const) {
  const frame = inspectionFrame(bounds, viewport, view, 0.17, 1.3);
  const resized = inspectionFrame(bounds, { width: 390, height: 420 }, view, 0.17, 1.3);
  const base = inspectionFrame(bounds, { width: 390, height: 420 }, view, 0.17, 1);
  assert(finiteFrame(frame) && finiteFrame(resized), `${view} is finite at both viewport sizes`);
  assert(frame.carZ === 0.17, `${view} preserves inspection entry translation`);
  assert(close(resized.zoom / base.zoom, 1.3), `${view} preserves user zoom factor after resize`);
}

assert(nextCarMode('guided', 'inspect') === 'inspect', 'inspection has an explicit entry');
assert(nextCarMode('inspect', 'inspect') === 'inspect', 'inspection entry is idempotent');
assert(nextCarMode('inspect', 'return') === 'returning', 'return disables inspection ownership');
assert(nextCarMode('returning', 'inspect') === 'returning', 'return cannot acquire a competing camera owner');
assert(nextCarMode('returning', 'settled') === 'guided', 'settling restores guided ownership');
assert(nextCarMode('guided', 'return') === 'guided', 'return while guided is a no-op');
assert(nextCarMode('inspect', 'fallback') === 'guided', 'failure resets camera ownership');

const inspected = inspectionFrame(bounds, viewport, 'front', 0.17, 1.4);
const oldGuided = guidedFrame(bounds, viewport, 0.12);
const currentGuided = guidedFrame(bounds, viewport, 0.91);
assert(returningFrame(inspected, currentGuided, 0).frame === inspected, 'return begins at the actual inspected camera, not an entry preset');
const complete = returningFrame(inspected, currentGuided, RETURN_SECONDS);
assert(complete.done && complete.frame === currentGuided, 'return ends at current guided progress');
assert(complete.frame.carZ !== oldGuided.carZ, 'return does not use stale entry progress');
assert(returningFrame(inspected, currentGuided, 0, true).frame === currentGuided, 'reduced-motion return is immediate');
for (let step = 0; step <= 20; step++) {
  const result = returningFrame(inspected, guidedFrame(bounds, viewport, step / 20), RETURN_SECONDS * step / 20);
  assert(finiteFrame(result.frame), 'return remains finite while its destination changes');
  assert(Math.hypot(...result.frame.position.map((value, axis) => value - result.frame.target[axis])) > 10, 'return orbits around, not through, the car');
}
const nearSeam: CameraFrame = { position: orbitPosition(20, 179, target), target, zoom: 1, carZ: 0 };
const acrossSeam: CameraFrame = { position: orbitPosition(20, -179, target), target, zoom: 1, carZ: 0 };
const halfway = blendCameraFrames(nearSeam, acrossSeam, 0.5);
assert(halfway.position[2] < target[2], 'angular return takes the short path across the azimuth seam');

const source = createProgressSource(NaN);
let notifications = 0;
const unsubscribe = source.subscribe(() => { notifications++; });
assert(source.current === 0, 'progress source sanitizes its initial value');
source.set(0.4);
source.set(0.4);
source.set(NaN);
source.set(Infinity);
assert(notifications === 1 && source.current === 0.4, 'unchanged and invalid progress do not notify');
source.set(7);
source.set(-4);
assert(notifications === 3 && source.current === 0, 'finite out-of-range updates are clamped');
unsubscribe();
unsubscribe();
source.set(0.7);
assert(notifications === 3, 'subscription cleanup is idempotent and removes the listener');
assert(createProgressSource(9).current === 1 && createProgressSource(-9).current === 0, 'initial finite progress is clamped');

console.log(`car-camera: ${checks - failures}/${checks} checks passed`);
if (failures > 0) process.exitCode = 1;
