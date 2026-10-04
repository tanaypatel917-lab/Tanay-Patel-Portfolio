'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { Html } from '@react-three/drei';
import { KeyboardScene } from './KeyboardScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface KeyboardCanvasProps {
  progressRef: React.MutableRefObject<number>;
  pulseRef: React.MutableRefObject<number>;
}

export function KeyboardCanvas({ progressRef, pulseRef }: KeyboardCanvasProps) {
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        shadows
        camera={{
          position: [0, 1.4, 2.8],
          fov: 35,
          near: 0.01,
          far: 100,
        }}
        gl={{ antialias: !reduced, alpha: false }}
        dpr={reduced ? [1, 1] : [1, 2]}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 1.1;
          gl.outputColorSpace = THREE.SRGBColorSpace;
          gl.shadowMap.enabled = !reduced;
          gl.shadowMap.type = THREE.PCFSoftShadowMap;

          const pmrem = new THREE.PMREMGenerator(gl);
          const room = new RoomEnvironment();
          const envMap = pmrem.fromScene(room).texture;
          scene.environment = envMap;
          pmrem.dispose();
        }}
      >
        <color attach="background" args={['#0a0a0a']} />
        <ambientLight intensity={0.15} />
        <Suspense
          fallback={
            <Html center>
              <div className="text-muted text-sm tracking-widest uppercase">
                Loading keyboard…
              </div>
            </Html>
          }
        >
          <KeyboardScene progressRef={progressRef} pulseRef={pulseRef} />
        </Suspense>
      </Canvas>
    </div>
  );
}
