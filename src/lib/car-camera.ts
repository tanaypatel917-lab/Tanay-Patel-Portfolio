export type Vec3 = readonly [number, number, number];

export interface CarBounds {
  min: Vec3;
  max: Vec3;
}

export interface CarViewport {
  width: number;
  height: number;
}

export interface CarPose {
  elevation: number;
  azimuth: number;
  carZ: number;
}

export interface CameraFrame {
  position: Vec3;
  target: Vec3;
  zoom: number;
  carZ: number;
}

export interface CameraSettings {
  travel?: number;
  margin?: number;
  radius?: number;
}

export type CarMode = 'guided' | 'inspect' | 'returning';
export type CarModeEvent = 'inspect' | 'return' | 'settled' | 'fallback';
export type InspectionView = 'front' | 'side' | 'rear' | 'reset';
export interface InspectionCommand {
  id: number;
  view: InspectionView;
}

export const MIN_INSPECTION_ZOOM = 0.75;
export const MAX_INSPECTION_ZOOM = 1.65;
export const RETURN_SECONDS = 0.45;

const radians = Math.PI / 180;
const finite = (value: number, fallback = 0) => Number.isFinite(value) ? value : fallback;
const clamp = (value: number, min: number, max: number) => Math.min(max, Math.max(min, value));
const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
const point = (value: Vec3): Vec3 => [finite(value[0]), finite(value[1]), finite(value[2])];
const subtract = (a: Vec3, b: Vec3): Vec3 => [a[0] - b[0], a[1] - b[1], a[2] - b[2]];
const dot = (a: Vec3, b: Vec3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: Vec3, b: Vec3): Vec3 => [
  a[1] * b[2] - a[2] * b[1],
  a[2] * b[0] - a[0] * b[2],
  a[0] * b[1] - a[1] * b[0],
];
const normalized = (value: Vec3, fallback: Vec3): Vec3 => {
  const length = Math.hypot(...value);
  return length > 1e-8 && Number.isFinite(length)
    ? [value[0] / length, value[1] / length, value[2] / length]
    : fallback;
};
const mixPoint = (a: Vec3, b: Vec3, t: number): Vec3 => [
  lerp(finite(a[0]), finite(b[0]), t),
  lerp(finite(a[1]), finite(b[1]), t),
  lerp(finite(a[2]), finite(b[2]), t),
];

export function clampProgress(value: number, fallback = 0): number {
  return clamp(finite(value, finite(fallback)), 0, 1);
}

export function clampInspectionZoom(value: number): number {
  return clamp(finite(value, 1), MIN_INSPECTION_ZOOM, MAX_INSPECTION_ZOOM);
}

export function nextCarMode(mode: CarMode, event: CarModeEvent): CarMode {
  if (event === 'fallback') return 'guided';
  if (event === 'inspect' && mode === 'guided') return 'inspect';
  if (event === 'return' && mode === 'inspect') return 'returning';
  if (event === 'settled' && mode === 'returning') return 'guided';
  return mode;
}

export function boundsCorners(bounds: CarBounds, carZ = 0): Vec3[] {
  const min = point(bounds.min);
  const max = point(bounds.max);
  const z = finite(carZ);
  return [
    [min[0], min[1], min[2] + z], [max[0], min[1], min[2] + z],
    [min[0], max[1], min[2] + z], [max[0], max[1], min[2] + z],
    [min[0], min[1], max[2] + z], [max[0], min[1], max[2] + z],
    [min[0], max[1], max[2] + z], [max[0], max[1], max[2] + z],
  ];
}

export function framingPoints(bounds: CarBounds, carZ = 0): Vec3[] {
  const width = Math.max(0.01, Math.abs(finite(bounds.max[0] - bounds.min[0], 2)));
  const length = Math.max(0.01, Math.abs(finite(bounds.max[2] - bounds.min[2], 5)));
  const ground = finite(bounds.min[1]);
  const lightBounds: CarBounds = {
    min: [finite(bounds.min[0]) - width * 0.08, ground, finite(bounds.min[2]) - length * 0.52],
    max: [finite(bounds.max[0]) + width * 0.08, ground + 0.02, finite(bounds.max[2]) + length * 0.14],
  };
  return [...boundsCorners(bounds, carZ), ...boundsCorners(lightBounds, carZ)];
}

export function cameraBasis(position: Vec3, target: Vec3) {
  const back = normalized(subtract(point(position), point(target)), [0, 0, 1]);
  const right = normalized(cross([0, 1, 0], back), [1, 0, 0]);
  const up = normalized(cross(back, right), [0, 1, 0]);
  return { right, up, back };
}

export function orbitPosition(elevation: number, azimuth: number, target: Vec3, radius = 20): Vec3 {
  const e = clamp(finite(elevation, 48), 5, 88) * radians;
  const a = finite(azimuth, -55) * radians;
  const r = Math.max(1, finite(radius, 20));
  const center = point(target);
  return [
    center[0] + r * Math.cos(e) * Math.sin(a),
    center[1] + r * Math.sin(e),
    center[2] + r * Math.cos(e) * Math.cos(a),
  ];
}

export function fitOrthographic(
  points: readonly Vec3[],
  position: Vec3,
  target: Vec3,
  viewport: CarViewport,
  margin = 1.14,
): number {
  const basis = cameraBasis(position, target);
  const center = point(target);
  let halfWidth = 0.01;
  let halfHeight = 0.01;
  for (const corner of points) {
    const offset = subtract(point(corner), center);
    halfWidth = Math.max(halfWidth, Math.abs(dot(offset, basis.right)));
    halfHeight = Math.max(halfHeight, Math.abs(dot(offset, basis.up)));
  }
  const width = Math.max(1, finite(viewport.width, 1));
  const height = Math.max(1, finite(viewport.height, 1));
  const padding = Math.max(1, finite(margin, 1.14));
  return Math.max(0.0001, finite(Math.min(width / (2 * halfWidth * padding), height / (2 * halfHeight * padding)), 1));
}

export function guidedPose(progress: number, reduced = false, travel = 0.28): CarPose {
  const p = reduced ? 1 : clampProgress(progress);
  const second = p > 0.5;
  const local = second ? (p - 0.5) * 2 : p * 2;
  const t = local * local * (3 - 2 * local);
  return {
    elevation: lerp(second ? 64 : 88, second ? 48 : 64, t),
    azimuth: lerp(second ? -25 : 0, second ? -55 : -25, t),
    carZ: reduced ? 0 : (0.5 - p) * 2 * clamp(finite(travel, 0.28), 0, 2),
  };
}

function frameAtPose(
  bounds: CarBounds,
  viewport: CarViewport,
  pose: CarPose,
  zoomFactor = 1,
  settings: CameraSettings = {},
): CameraFrame {
  const min = point(bounds.min);
  const max = point(bounds.max);
  const target: Vec3 = [
    (min[0] + max[0]) / 2,
    min[1] + (max[1] - min[1]) * 0.42,
    (min[2] + max[2]) / 2 + pose.carZ - (max[2] - min[2]) * 0.08,
  ];
  const position = orbitPosition(pose.elevation, pose.azimuth, target, settings.radius);
  return {
    position,
    target,
    zoom: fitOrthographic(framingPoints(bounds, pose.carZ), position, target, viewport, settings.margin) * clampInspectionZoom(zoomFactor),
    carZ: pose.carZ,
  };
}

export function guidedFrame(
  bounds: CarBounds,
  viewport: CarViewport,
  progress: number,
  reduced = false,
  settings: CameraSettings = {},
): CameraFrame {
  return frameAtPose(bounds, viewport, guidedPose(progress, reduced, settings.travel), 1, settings);
}

export function inspectionFrame(
  bounds: CarBounds,
  viewport: CarViewport,
  view: InspectionView,
  carZ: number,
  zoomFactor = 1,
  settings: CameraSettings = {},
): CameraFrame {
  const poses: Record<InspectionView, [number, number]> = {
    front: [18, 180],
    side: [18, -90],
    rear: [18, 0],
    reset: [48, -55],
  };
  const [elevation, azimuth] = poses[view];
  return frameAtPose(bounds, viewport, { elevation, azimuth, carZ: finite(carZ) }, zoomFactor, settings);
}

export function blendCameraFrames(from: CameraFrame, to: CameraFrame, amount: number): CameraFrame {
  const t = clampProgress(amount);
  if (t === 0) return from;
  if (t === 1) return to;
  const start = subtract(point(from.position), point(from.target));
  const end = subtract(point(to.position), point(to.target));
  const startYaw = Math.atan2(start[0], start[2]);
  const endYaw = Math.atan2(end[0], end[2]);
  const yawDelta = Math.atan2(Math.sin(endYaw - startYaw), Math.cos(endYaw - startYaw));
  const startElevation = Math.atan2(start[1], Math.hypot(start[0], start[2]));
  const endElevation = Math.atan2(end[1], Math.hypot(end[0], end[2]));
  const target = mixPoint(from.target, to.target, t);
  const position = orbitPosition(
    lerp(startElevation, endElevation, t) / radians,
    (startYaw + yawDelta * t) / radians,
    target,
    lerp(Math.hypot(...start), Math.hypot(...end), t),
  );
  return {
    position,
    target,
    zoom: Math.max(0.0001, lerp(finite(from.zoom, 1), finite(to.zoom, 1), t)),
    carZ: lerp(finite(from.carZ), finite(to.carZ), t),
  };
}

export function returningFrame(from: CameraFrame, currentGuided: CameraFrame, elapsed: number, reduced = false) {
  const progress = reduced ? 1 : clampProgress(finite(elapsed) / RETURN_SECONDS);
  return {
    frame: blendCameraFrames(from, currentGuided, progress * progress * (3 - 2 * progress)),
    done: progress === 1,
  };
}
