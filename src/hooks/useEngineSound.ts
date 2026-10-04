'use client';

import { useEffect, useRef, type MutableRefObject } from 'react';
import { useSound, type EnginePlaybackLease } from '@/components/shared/SoundProvider';

const VOLUME = 0.18;
const FADE_MS = 600;
const PLAY_TIMEOUT_MS = 2500;

interface EngineSoundOptions {
  /** Sound is on and the Cars chapter is active. */
  active: boolean;
  /** Car speed in world units per second, written by the 3D scene. */
  speedRef: MutableRefObject<number>;
}

/**
 * Loops the synthetic engine sound while the Cars chapter is active and sound is
 * on. Audio is prepared only after explicit consent, the loop fades in and stops promptly,
 * and the pitch follows the car's speed. Nothing here can play before the user has
 * pressed the sound toggle.
 */
export function useEngineSound({ active, speedRef }: EngineSoundOptions) {
  const { enabled, engine, reportPlaybackFailure } = useSound();
  const activeRef = useRef(active);
  activeRef.current = active;

  useEffect(() => {
    if (!active || !enabled || !engine) return;

    let cancelled = false;
    let generation = 0;
    let interval: number | undefined;
    let playTimer: number | undefined;
    let playback: EnginePlaybackLease | null = null;
    const { audio, context, gain } = engine;
    const canPlay = () => !cancelled && activeRef.current && engine.canPlay() && !document.hidden;
    const stop = () => {
      generation += 1;
      window.clearInterval(interval);
      window.clearTimeout(playTimer);
      interval = undefined;
      playTimer = undefined;
      playback?.stop();
      playback = null;
    };
    const fail = () => {
      const report = canPlay() && playback?.isCurrent();
      stop();
      if (report) reportPlaybackFailure(engine, audio.error || context.state === 'closed' ? 'error' : 'blocked');
    };
    const updatePitch = () => {
      const speed = Number.isFinite(speedRef.current) ? Math.abs(speedRef.current) : 0;
      audio.playbackRate = 1 + Math.min(speed * 0.1, 0.35);
    };
    const start = () => {
      stop();
      if (!canPlay()) return;
      playback = engine.claimPlayback();
      const lease = playback;
      const attempt = generation;
      const current = () => attempt === generation && lease.isCurrent() && canPlay();
      playTimer = window.setTimeout(() => {
        if (playTimer !== undefined && current()) fail();
      }, PLAY_TIMEOUT_MS);

      const play = () => {
        if (!current()) return;
        try {
          updatePitch();
          void Promise.resolve(audio.play()).then(() => {
            if (!current()) return;
            if (context.state !== 'running' || audio.paused) {
              fail();
              return;
            }
            window.clearTimeout(playTimer);
            playTimer = undefined;
            gain.gain.cancelScheduledValues(context.currentTime);
            gain.gain.setValueAtTime(0, context.currentTime);
            gain.gain.linearRampToValueAtTime(VOLUME, context.currentTime + FADE_MS / 1000);
            interval = window.setInterval(() => {
              if (attempt !== generation) return;
              if (!current()) {
                stop();
              } else if (context.state !== 'running' || audio.paused) {
                fail();
              } else {
                updatePitch();
              }
            }, 120);
          }).catch(() => {
            if (current()) fail();
          });
        } catch {
          if (current()) fail();
        }
      };

      if (context.state === 'running') {
        play();
      } else {
        try {
          void context.resume().then(play).catch(() => {
            if (current()) fail();
          });
        } catch {
          if (current()) fail();
        }
      }
    };
    const onVisibilityChange = () => {
      if (document.hidden) stop();
      else if (canPlay()) start();
    };
    const onError = () => { if (audio.error) fail(); };
    const onContextChange = () => {
      if (!document.hidden && context.state !== 'running' && !audio.paused) fail();
    };

    document.addEventListener('visibilitychange', onVisibilityChange);
    audio.addEventListener('error', onError);
    context.addEventListener('statechange', onContextChange);
    start();

    return () => {
      cancelled = true;
      document.removeEventListener('visibilitychange', onVisibilityChange);
      audio.removeEventListener('error', onError);
      context.removeEventListener('statechange', onContextChange);
      stop();
    };
  }, [active, enabled, engine, reportPlaybackFailure, speedRef]);
}
