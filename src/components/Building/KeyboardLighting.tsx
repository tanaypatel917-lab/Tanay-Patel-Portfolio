'use client';

import { useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

export function KeyboardLighting({ pulse }: { pulse: number }) {
  const accentLight = useRef<THREE.PointLight>(null);

  useFrame((_, dt) => {
    if (accentLight.current) {
      const target = 0.5 + pulse * 2.0;
      accentLight.current.intensity = THREE.MathUtils.lerp(
        accentLight.current.intensity,
        target,
        1 - Math.exp(-8 * dt)
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.4} />
      <directionalLight
        position={[1.2, 1.8, 1.2]}
        intensity={1.0}
        color="#fff9f0"
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-camera-near={0.1}
        shadow-camera-far={8}
        shadow-camera-left={-2}
        shadow-camera-right={2}
        shadow-camera-top={2}
        shadow-camera-bottom={-2}
      />
      <directionalLight
        position={[-1.2, 1.0, 1.2]}
        intensity={0.5}
        color="#d4e8ff"
      />
      <pointLight
        ref={accentLight}
        position={[0, 0.5, 0.35]}
        color="#4a9eff"
        intensity={0.5}
        distance={3}
        decay={2}
      />
    </>
  );
}
