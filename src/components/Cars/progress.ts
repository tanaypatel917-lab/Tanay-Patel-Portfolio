/**
 * A tiny mutable progress value with change notification, shared between the
 * ScrollTrigger that drives the Cars chapter and the render loops that consume
 * it (the demand-rendered R3F scene, the engine sound). No React re-renders.
 */
export interface ProgressSource {
  readonly current: number;
  set: (value: number) => void;
  subscribe: (listener: () => void) => () => void;
}

function clamp(value: number, fallback = 0) {
  return Number.isFinite(value) ? Math.max(0, Math.min(1, value)) : fallback;
}

export function createProgressSource(initial = 0): ProgressSource {
  const listeners = new Set<() => void>();
  let current = clamp(initial);
  return {
    get current() {
      return current;
    },
    set(value) {
      const next = clamp(value, current);
      if (next === current) return;
      current = next;
      listeners.forEach((listener) => listener());
    },
    subscribe(listener) {
      listeners.add(listener);
      return () => { listeners.delete(listener); };
    },
  };
}
