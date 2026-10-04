export const INTRO_KEY = 'tp-intro-v2';
export const INTRO_PREPARE_MS = 250;
export const INTRO_DEADLINE_MS = 3000;
export const INTRO_DURATION = 2.3;

export type IntroPhase = 'preparing' | 'performing' | 'docking' | 'complete';
export type IntroEvent = 'prepared' | 'dock' | 'finish' | 'skip' | 'hidden' | 'resize' | 'error' | 'reduced' | 'timeout' | 'unmount';

export interface IntroState {
  phase: IntroPhase;
  startedAt: number;
  reason: IntroEvent | null;
}

export interface IntroEligibility {
  reduced: boolean;
  seen: boolean;
  hash: string;
  navigationType: string;
  scrollY: number;
  ageMs: number;
  visible: boolean;
  replay: boolean;
}

export function isIntroEligible(input: IntroEligibility): boolean {
  if (input.reduced || !input.visible || !Number.isFinite(input.scrollY)) return false;
  if (input.replay) return input.scrollY <= 4;
  return !input.seen && !input.hash && input.navigationType !== 'back_forward' && input.scrollY <= 4 && input.ageMs <= 1200;
}

export function createIntroState(now: number): IntroState {
  return { phase: 'preparing', startedAt: now, reason: null };
}

export function advanceIntro(state: IntroState, event: IntroEvent, now: number): IntroState {
  if (state.phase === 'complete') return state;
  if (now - state.startedAt >= INTRO_DEADLINE_MS || event === 'timeout') return { ...state, phase: 'complete', reason: 'timeout' };
  if (event === 'prepared') return state.phase === 'preparing' ? { ...state, phase: 'performing' } : state;
  if (event === 'dock') return state.phase === 'performing' ? { ...state, phase: 'docking' } : state;
  return { ...state, phase: 'complete', reason: event };
}

export function hasSeenIntro(): boolean {
  try {
    return sessionStorage.getItem(INTRO_KEY) === '1';
  } catch {
    return false;
  }
}

export function rememberIntro() {
  try {
    sessionStorage.setItem(INTRO_KEY, '1');
  } catch {}
}
