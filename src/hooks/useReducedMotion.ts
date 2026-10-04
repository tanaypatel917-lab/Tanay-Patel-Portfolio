'use client';

import { useSyncExternalStore } from 'react';

const KEY = 'tp-reduce-motion';
const listeners = new Set<() => void>();
let preference: boolean | undefined;
let media: MediaQueryList | undefined;

function getMedia() {
  if (typeof window === 'undefined') return undefined;
  media ??= window.matchMedia('(prefers-reduced-motion: reduce)');
  return media;
}

export function getUserReducedMotion(): boolean {
  if (typeof window === 'undefined') return false;
  if (preference === undefined) {
    try {
      preference = sessionStorage.getItem(KEY) === '1';
    } catch {
      preference = false;
    }
  }
  return preference;
}

export function getReducedMotion(): boolean {
  if (typeof window === 'undefined') return true;
  return getUserReducedMotion() || Boolean(getMedia()?.matches);
}

function notify() {
  listeners.forEach((listener) => listener());
}

function subscribe(listener: () => void) {
  const query = getMedia();
  if (listeners.size === 0) query?.addEventListener('change', notify);
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
    if (listeners.size === 0) query?.removeEventListener('change', notify);
  };
}

export function setUserReducedMotion(value: boolean) {
  preference = value;
  try {
    sessionStorage.setItem(KEY, value ? '1' : '0');
  } catch {}
  notify();
}

export function useReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getReducedMotion, () => true);
}

export function useUserReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, getUserReducedMotion, () => false);
}

export function useSystemReducedMotion(): boolean {
  return useSyncExternalStore(subscribe, () => Boolean(getMedia()?.matches), () => true);
}
