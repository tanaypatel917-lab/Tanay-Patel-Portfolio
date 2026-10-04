'use client';

import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';

export type SoundStatus = 'off' | 'loading' | 'ready' | 'blocked' | 'error';

export interface EnginePlaybackLease {
  isCurrent: () => boolean;
  stop: () => void;
}

export interface EngineSoundResource {
  audio: HTMLAudioElement;
  context: AudioContext;
  gain: GainNode;
  canPlay: () => boolean;
  claimPlayback: () => EnginePlaybackLease;
  stop: () => void;
}

interface OwnedEngineSound extends EngineSoundResource {
  unload: () => void;
}

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
  status: SoundStatus;
  engine: EngineSoundResource | null;
  reportPlaybackFailure: (engine: EngineSoundResource, status?: 'blocked' | 'error') => void;
}

const SoundContext = createContext<SoundContextValue>({
  enabled: false,
  toggle: () => {},
  status: 'off',
  engine: null,
  reportPlaybackFailure: () => {},
});

const KEY = 'tp-sound';
const UNLOCK_TIMEOUT_MS = 2000;
const LOAD_TIMEOUT_MS = 15000;

function createEngine(canPlay: () => boolean): OwnedEngineSound {
  const AudioContextClass = window.AudioContext
    ?? (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
  if (!AudioContextClass) throw new Error('Web Audio is unavailable.');

  const audio = new Audio();
  const context = new AudioContextClass();

  try {
    const source = context.createMediaElementSource(audio);
    const gain = context.createGain();
    gain.gain.setValueAtTime(0, context.currentTime);
    source.connect(gain);
    gain.connect(context.destination);
    audio.loop = true;
    audio.preload = 'auto';
    audio.preservesPitch = false;
    audio.src = '/sounds/engine.wav';
    let disposed = false;
    let generation = 0;

    const stop = () => {
      if (disposed) return;
      generation += 1;
      audio.pause();
      if (context.state !== 'closed') {
        gain.gain.cancelScheduledValues(context.currentTime);
        gain.gain.setValueAtTime(0, context.currentTime);
      }
      audio.playbackRate = 1;
    };

    return {
      audio,
      context,
      gain,
      canPlay: () => !disposed && context.state !== 'closed' && canPlay(),
      claimPlayback: () => {
        stop();
        const lease = generation;
        const isCurrent = () => !disposed && lease === generation;
        return { isCurrent, stop: () => { if (isCurrent()) stop(); } };
      },
      stop,
      unload: () => {
        if (disposed) return;
        stop();
        disposed = true;
        audio.removeAttribute('src');
        audio.load();
        source.disconnect();
        gain.disconnect();
        if (context.state !== 'closed') void context.close().catch(() => {});
      },
    };
  } catch (error) {
    audio.pause();
    audio.removeAttribute('src');
    audio.load();
    if (context.state !== 'closed') void context.close().catch(() => {});
    throw error;
  }
}

export function useSound(): SoundContextValue {
  return useContext(SoundContext);
}

/**
 * Sound is opt-in. It starts off on every new page, the choice is remembered
 * for the session only, and nothing is audible until the user has pressed the toggle
 * (which is also the gesture browsers require before audio may start).
 */
export function SoundProvider({ children }: { children: ReactNode }) {
  const [status, setStatus] = useState<SoundStatus>('off');
  const [engine, setEngine] = useState<EngineSoundResource | null>(null);
  const statusRef = useRef<SoundStatus>('off');
  const engineRef = useRef<OwnedEngineSound | null>(null);
  const preferenceRef = useRef(false);
  const requestedRef = useRef(false);
  const mountedRef = useRef(false);
  const generationRef = useRef(0);
  const cancelAttemptRef = useRef<(() => void) | null>(null);

  const publishStatus = useCallback((next: SoundStatus) => {
    statusRef.current = next;
    if (mountedRef.current) setStatus(next);
  }, []);

  const clearAttempt = useCallback(() => {
    cancelAttemptRef.current?.();
    cancelAttemptRef.current = null;
  }, []);

  const reportPlaybackFailure = useCallback((resource: EngineSoundResource, failure: 'blocked' | 'error' = 'blocked') => {
    if (!mountedRef.current || !requestedRef.current || engineRef.current?.audio !== resource.audio) return;
    generationRef.current += 1;
    clearAttempt();
    engineRef.current.stop();
    publishStatus(failure);
  }, [clearAttempt, publishStatus]);

  useEffect(() => {
    mountedRef.current = true;
    requestedRef.current = false;
    preferenceRef.current = false;
    publishStatus('off');
    setEngine(null);
    try {
      preferenceRef.current = sessionStorage.getItem(KEY) === '1';
    } catch {
      /* storage unavailable: stay off */
    }

    const onVisibilityChange = () => {
      if (!document.hidden) return;
      generationRef.current += 1;
      clearAttempt();
      engineRef.current?.stop();
      if (statusRef.current === 'loading') publishStatus('blocked');
    };
    document.addEventListener('visibilitychange', onVisibilityChange);

    return () => {
      mountedRef.current = false;
      requestedRef.current = false;
      generationRef.current += 1;
      clearAttempt();
      document.removeEventListener('visibilitychange', onVisibilityChange);
      engineRef.current?.unload();
      engineRef.current = null;
    };
  }, [clearAttempt, publishStatus]);

  useEffect(() => {
    if (!engine) return;
    const onResourceError = () => {
      if (statusRef.current === 'ready' && (engine.audio.error || engine.context.state === 'closed')) {
        reportPlaybackFailure(engine, 'error');
      }
    };
    engine.audio.addEventListener('error', onResourceError);
    engine.context.addEventListener('statechange', onResourceError);
    onResourceError();
    return () => {
      engine.audio.removeEventListener('error', onResourceError);
      engine.context.removeEventListener('statechange', onResourceError);
    };
  }, [engine, reportPlaybackFailure]);

  const toggle = useCallback(() => {
    if (!mountedRef.current) return;
    const previousStatus = statusRef.current;
    const next = previousStatus !== 'ready' && previousStatus !== 'loading';
    generationRef.current += 1;
    const generation = generationRef.current;
    clearAttempt();
    engineRef.current?.stop();
    requestedRef.current = next;
    preferenceRef.current = next;
    try {
      sessionStorage.setItem(KEY, next ? '1' : '0');
    } catch {
      /* ignore */
    }
    if (!next) {
      publishStatus('off');
      return;
    }
    if (document.hidden) {
      publishStatus('blocked');
      return;
    }

    publishStatus('loading');
    let resource = engineRef.current;
    try {
      if (resource?.context.state === 'closed') {
        resource.unload();
        engineRef.current = null;
        setEngine(null);
        resource = null;
      }
      if (!resource) {
        resource = createEngine(() => mountedRef.current && requestedRef.current
          && preferenceRef.current && statusRef.current === 'ready' && !document.hidden);
        engineRef.current = resource;
      } else if (previousStatus === 'error' || resource.audio.error) {
        resource.audio.load();
      }
    } catch {
      publishStatus('error');
      return;
    }

    const currentEngine = resource;
    const current = () => mountedRef.current && requestedRef.current && !document.hidden
      && statusRef.current === 'loading' && generationRef.current === generation && engineRef.current === currentEngine;
    const fail = (failure: 'blocked' | 'error') => {
      if (current()) reportPlaybackFailure(currentEngine, failure);
    };
    const onError = () => {
      if (currentEngine.audio.error) fail('error');
    };
    currentEngine.audio.addEventListener('error', onError);
    const unlockTimer = window.setTimeout(() => {
      if (currentEngine.context.state !== 'running') {
        fail(currentEngine.context.state === 'closed' ? 'error' : 'blocked');
      }
    }, UNLOCK_TIMEOUT_MS);
    const loadTimer = window.setTimeout(() => {
      fail(currentEngine.audio.readyState < 2 || currentEngine.audio.error ? 'error' : 'blocked');
    }, LOAD_TIMEOUT_MS);
    cancelAttemptRef.current = () => {
      window.clearTimeout(unlockTimer);
      window.clearTimeout(loadTimer);
      currentEngine.audio.removeEventListener('error', onError);
    };

    const onPlaybackError = () => fail(currentEngine.audio.error || currentEngine.context.state === 'closed' ? 'error' : 'blocked');
    try {
      const resumed = currentEngine.context.resume();
      void resumed.catch(onPlaybackError);
      const playing = currentEngine.audio.play();
      void Promise.all([resumed, playing]).then(() => {
        if (!current()) return;
        if (currentEngine.context.state !== 'running' || currentEngine.audio.paused) {
          fail('blocked');
          return;
        }
        clearAttempt();
        currentEngine.stop();
        setEngine({ ...currentEngine });
        publishStatus('ready');
      }).catch(onPlaybackError);
    } catch {
      onPlaybackError();
    }
  }, [clearAttempt, publishStatus, reportPlaybackFailure]);

  const value = useMemo(() => ({
    enabled: status === 'ready',
    toggle,
    status,
    engine,
    reportPlaybackFailure,
  }), [engine, reportPlaybackFailure, status, toggle]);

  return <SoundContext.Provider value={value}>{children}</SoundContext.Provider>;
}
