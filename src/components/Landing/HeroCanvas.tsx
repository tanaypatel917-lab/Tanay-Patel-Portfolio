'use client';

import { Canvas } from '@react-three/fiber';
import { ParticleField } from './ParticleField';

export function HeroCanvas() {
  return (
    <Canvas
      camera={{ position: [0, 0, 12], fov: 60, near: 0.1, far: 50 }}
      className="absolute inset-0 w-full h-full"
      gl={{ antialias: true, alpha: false }}
      dpr={[1, 1.5]}
    >
      <color attach="background" args={['#0a0a0a']} />
      <fog attach="fog" args={['#0a0a0a', 8, 25]} />
      <ParticleField />
    </Canvas>
  );
}
