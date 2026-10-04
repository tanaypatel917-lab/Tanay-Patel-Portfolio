'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { KeyboardModel } from './KeyboardModel';
import { KeyboardLighting } from './KeyboardLighting';

interface KeyboardSceneProps {
  progressRef: React.MutableRefObject<number>;
  pulseRef: React.MutableRefObject<number>;
}

export function KeyboardScene({ progressRef, pulseRef }: KeyboardSceneProps) {
  const group = useRef<THREE.Group>(null);

  useFrame((state, dt) => {
    const p = Math.max(0, Math.min(1, progressRef.current));
    const t = state.clock.elapsedTime;

    if (group.current) {
      // Slow floating + gentle scroll-driven orbit
      group.current.rotation.x = THREE.MathUtils.lerp(
        group.current.rotation.x,
        -0.2 - p * 0.15 + Math.sin(t * 0.4) * 0.015,
        1 - Math.exp(-5 * dt)
      );
      group.current.rotation.y = THREE.MathUtils.lerp(
        group.current.rotation.y,
        0.15 + p * 0.3 + Math.cos(t * 0.35) * 0.02,
        1 - Math.exp(-5 * dt)
      );
      group.current.rotation.z = Math.sin(t * 0.2) * 0.008;

      group.current.position.y = Math.sin(t * 0.6) * 0.02;
    }

    if (pulseRef.current > 0) {
      pulseRef.current = THREE.MathUtils.lerp(pulseRef.current, 0, 1 - Math.exp(-12 * dt));
    }
  });

  return (
    <>
      <KeyboardLighting pulse={pulseRef.current} />
      <group ref={group} scale={2.5} position={[0, 0, 0]}>
        <KeyboardModel />
      </group>
    </>
  );
}
