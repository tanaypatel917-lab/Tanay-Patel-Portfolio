'use client';

import {
  createContext,
  useContext,
  useState,
  useCallback,
  useRef,
  useEffect,
} from 'react';
import { Howl } from 'howler';

type SoundMap = Record<string, string | string[]>;

interface PlayOptions {
  loop?: boolean;
  rate?: number;
  volume?: number;
  pan?: number;
}

interface SoundContextValue {
  enabled: boolean;
  toggle: () => void;
  play: (name: string, options?: PlayOptions) => void;
  stop: (name: string) => void;
  setRate: (name: string, rate: number) => void;
}

const SoundContext = createContext<SoundContextValue | null>(null);

export function SoundProvider({
  children,
  sounds,
}: {
  children: React.ReactNode;
  sounds: SoundMap;
}) {
  const [enabled, setEnabled] = useState(false);
  const howlsRef = useRef<Record<string, Howl>>({});
  const playingIdsRef = useRef<Record<string, number>>({});

  useEffect(() => {
    const map: Record<string, Howl> = {};
    for (const [name, src] of Object.entries(sounds)) {
      map[name] = new Howl({
        src: Array.isArray(src) ? src : [src],
        preload: true,
        volume: 0.8,
      });
    }
    howlsRef.current = map;

    return () => {
      for (const howl of Object.values(map)) {
        howl.unload();
      }
      playingIdsRef.current = {};
    };
  }, [sounds]);

  const toggle = useCallback(() => {
    setEnabled((prev) => {
      const next = !prev;
      Howler.mute(!next);
      return next;
    });
  }, []);

  const play = useCallback((name: string, options?: PlayOptions) => {
    if (!enabled) return;
    const howl = howlsRef.current[name];
    if (!howl) return;

    // stop any existing playback of this sound before starting a new one
    const existing = playingIdsRef.current[name];
    if (existing !== undefined) {
      howl.stop(existing);
    }

    const id = howl.play();
    playingIdsRef.current[name] = id;

    if (options?.loop !== undefined) howl.loop(options.loop, id);
    if (options?.rate !== undefined) howl.rate(options.rate, id);
    if (options?.volume !== undefined) howl.volume(options.volume, id);
    if (options?.pan !== undefined) howl.stereo(options.pan, id);
  }, [enabled]);

  const stop = useCallback((name: string) => {
    const howl = howlsRef.current[name];
    if (!howl) return;
    const id = playingIdsRef.current[name];
    if (id !== undefined) {
      howl.stop(id);
      delete playingIdsRef.current[name];
    }
  }, []);

  const setRate = useCallback((name: string, rate: number) => {
    const howl = howlsRef.current[name];
    if (!howl) return;
    const id = playingIdsRef.current[name];
    if (id !== undefined) {
      howl.rate(rate, id);
    }
  }, []);

  return (
    <SoundContext.Provider value={{ enabled, toggle, play, stop, setRate }}>
      {children}
    </SoundContext.Provider>
  );
}

export function useSoundEffect(): SoundContextValue {
  const ctx = useContext(SoundContext);
  if (!ctx) {
    throw new Error('useSoundEffect must be used within a SoundProvider');
  }
  return ctx;
}
