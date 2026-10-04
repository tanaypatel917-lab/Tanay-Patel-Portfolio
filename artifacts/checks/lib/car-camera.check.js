"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const car_camera_1 = require("./car-camera");
const progress_1 = require("../components/Cars/progress");
let failures = 0;
let checks = 0;
function assert(condition, message) {
    checks++;
    if (!condition) {
        failures++;
        console.error('FAIL:', message);
    }
}
const close = (a, b) => Math.abs(a - b) < 1e-7;
const dot = (a, b) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const finiteFrame = (frame) => [...frame.position, ...frame.target, frame.zoom, frame.carZ].every(Number.isFinite) && frame.zoom > 0;
const bounds = { min: [-1.32, 0.07, -2.63], max: [1.07, 1.39, 2.27] };
const viewport = { width: 940, height: 560 };
assert((0, car_camera_1.clampProgress)(-4) === 0 && (0, car_camera_1.clampProgress)(8) === 1, 'progress clamps its finite range');
assert((0, car_camera_1.clampProgress)(NaN) === 0 && (0, car_camera_1.clampProgress)(Infinity, 0.4) === 0.4, 'non-finite progress uses a finite fallback');
assert((0, car_camera_1.clampProgress)(NaN, NaN) === 0, 'non-finite fallback is safe');
assert((0, car_camera_1.guidedPose)(0).elevation === 88 && (0, car_camera_1.guidedPose)(0).azimuth === 0, 'near-top pose avoids the pole');
assert((0, car_camera_1.guidedPose)(0.5).elevation === 64 && (0, car_camera_1.guidedPose)(0.5).azimuth === -25, 'middle pose exposes three-quarter form');
assert((0, car_camera_1.guidedPose)(1).elevation === 48 && (0, car_camera_1.guidedPose)(1).azimuth === -55, 'final pose has a distinct stance');
assert(JSON.stringify((0, car_camera_1.guidedPose)(0.1, true)) === JSON.stringify((0, car_camera_1.guidedPose)(0.9, true)), 'reduced motion ignores scroll');
assert((0, car_camera_1.guidedPose)(0, true).carZ === 0, 'reduced motion has no automatic translation');
for (const progress of [-Infinity, -1, 0, 0.05, 0.25, 0.5, 0.75, 0.99, 1, 8, Infinity, NaN]) {
    for (const size of [{ width: 320, height: 480 }, { width: 1440, height: 640 }, { width: 320, height: 180 }, { width: 768, height: 460 }]) {
        const frame = (0, car_camera_1.guidedFrame)(bounds, size, progress);
        assert(finiteFrame(frame), `finite guided frame at ${progress} / ${size.width}`);
        const basis = (0, car_camera_1.cameraBasis)(frame.position, frame.target);
        assert(close(Math.hypot(...basis.up), 1) && close(Math.hypot(...basis.right), 1), 'camera basis has unit axes');
        assert(close(dot(basis.up, basis.right), 0) && close(dot(basis.up, basis.back), 0), 'camera basis is orthogonal');
        for (const corner of (0, car_camera_1.framingPoints)(bounds, frame.carZ)) {
            const offset = [corner[0] - frame.target[0], corner[1] - frame.target[1], corner[2] - frame.target[2]];
            assert(Math.abs(dot(offset, basis.right)) * frame.zoom <= size.width / (2 * 1.14) + 1e-7, 'all body/beam corners fit horizontally with margin');
            assert(Math.abs(dot(offset, basis.up)) * frame.zoom <= size.height / (2 * 1.14) + 1e-7, 'all body/beam corners fit vertically with margin');
        }
    }
}
const angle = 0.71;
const transformed = (0, car_camera_1.boundsCorners)(bounds).map(([x, y, z]) => [
    x * Math.cos(angle) - z * Math.sin(angle) + 8,
    y + 0.7,
    x * Math.sin(angle) + z * Math.cos(angle) - 3,
]);
const target = [8, 1.2, -3];
const position = (0, car_camera_1.orbitPosition)(33, -112, target);
const zoom = (0, car_camera_1.fitOrthographic)(transformed, position, target, viewport);
const basis = (0, car_camera_1.cameraBasis)(position, target);
assert(transformed.length === 8, 'transformed bounds preserve all eight corners');
for (const corner of transformed) {
    const offset = [corner[0] - target[0], corner[1] - target[1], corner[2] - target[2]];
    assert(Math.abs(dot(offset, basis.right)) * zoom <= viewport.width / (2 * 1.14) + 1e-7, 'non-axis-aligned bounds fit width');
    assert(Math.abs(dot(offset, basis.up)) * zoom <= viewport.height / (2 * 1.14) + 1e-7, 'non-axis-aligned bounds fit height');
}
assert(Number.isFinite((0, car_camera_1.fitOrthographic)([], [0, 20, 0], [0, 0, 0], { width: 0, height: NaN })), 'empty bounds, zero size and a top view remain finite');
assert(Math.abs((0, car_camera_1.orbitPosition)(90, 0, [0, 0, 0])[2]) > 0, 'requested exactly-top view is kept away from singularity');
for (const value of [-10, 0, 0.9, 1, 2, NaN, Infinity]) {
    const factor = (0, car_camera_1.clampInspectionZoom)(value);
    assert(factor >= car_camera_1.MIN_INSPECTION_ZOOM && factor <= car_camera_1.MAX_INSPECTION_ZOOM, 'inspection zoom is finite and bounded');
}
for (const view of ['front', 'side', 'rear', 'reset']) {
    const frame = (0, car_camera_1.inspectionFrame)(bounds, viewport, view, 0.17, 1.3);
    const resized = (0, car_camera_1.inspectionFrame)(bounds, { width: 390, height: 420 }, view, 0.17, 1.3);
    const base = (0, car_camera_1.inspectionFrame)(bounds, { width: 390, height: 420 }, view, 0.17, 1);
    assert(finiteFrame(frame) && finiteFrame(resized), `${view} is finite at both viewport sizes`);
    assert(frame.carZ === 0.17, `${view} preserves inspection entry translation`);
    assert(close(resized.zoom / base.zoom, 1.3), `${view} preserves user zoom factor after resize`);
}
assert((0, car_camera_1.nextCarMode)('guided', 'inspect') === 'inspect', 'inspection has an explicit entry');
assert((0, car_camera_1.nextCarMode)('inspect', 'inspect') === 'inspect', 'inspection entry is idempotent');
assert((0, car_camera_1.nextCarMode)('inspect', 'return') === 'returning', 'return disables inspection ownership');
assert((0, car_camera_1.nextCarMode)('returning', 'inspect') === 'returning', 'return cannot acquire a competing camera owner');
assert((0, car_camera_1.nextCarMode)('returning', 'settled') === 'guided', 'settling restores guided ownership');
assert((0, car_camera_1.nextCarMode)('guided', 'return') === 'guided', 'return while guided is a no-op');
assert((0, car_camera_1.nextCarMode)('inspect', 'fallback') === 'guided', 'failure resets camera ownership');
const inspected = (0, car_camera_1.inspectionFrame)(bounds, viewport, 'front', 0.17, 1.4);
const oldGuided = (0, car_camera_1.guidedFrame)(bounds, viewport, 0.12);
const currentGuided = (0, car_camera_1.guidedFrame)(bounds, viewport, 0.91);
assert((0, car_camera_1.returningFrame)(inspected, currentGuided, 0).frame === inspected, 'return begins at the actual inspected camera, not an entry preset');
const complete = (0, car_camera_1.returningFrame)(inspected, currentGuided, car_camera_1.RETURN_SECONDS);
assert(complete.done && complete.frame === currentGuided, 'return ends at current guided progress');
assert(complete.frame.carZ !== oldGuided.carZ, 'return does not use stale entry progress');
assert((0, car_camera_1.returningFrame)(inspected, currentGuided, 0, true).frame === currentGuided, 'reduced-motion return is immediate');
for (let step = 0; step <= 20; step++) {
    const result = (0, car_camera_1.returningFrame)(inspected, (0, car_camera_1.guidedFrame)(bounds, viewport, step / 20), car_camera_1.RETURN_SECONDS * step / 20);
    assert(finiteFrame(result.frame), 'return remains finite while its destination changes');
    assert(Math.hypot(...result.frame.position.map((value, axis) => value - result.frame.target[axis])) > 10, 'return orbits around, not through, the car');
}
const nearSeam = { position: (0, car_camera_1.orbitPosition)(20, 179, target), target, zoom: 1, carZ: 0 };
const acrossSeam = { position: (0, car_camera_1.orbitPosition)(20, -179, target), target, zoom: 1, carZ: 0 };
const halfway = (0, car_camera_1.blendCameraFrames)(nearSeam, acrossSeam, 0.5);
assert(halfway.position[2] < target[2], 'angular return takes the short path across the azimuth seam');
const source = (0, progress_1.createProgressSource)(NaN);
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
assert((0, progress_1.createProgressSource)(9).current === 1 && (0, progress_1.createProgressSource)(-9).current === 0, 'initial finite progress is clamped');
console.log(`car-camera: ${checks - failures}/${checks} checks passed`);
if (failures > 0)
    process.exitCode = 1;
