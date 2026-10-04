'use client';

import { Suspense } from 'react';
import { Canvas } from '@react-three/fiber';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { EffectComposer, Bloom } from '@react-three/postprocessing';
import { Html } from '@react-three/drei';
import { CarCamera } from './CarCamera';
import { CarScene } from './CarScene';
import { useReducedMotion } from '@/hooks/useReducedMotion';

interface CarCanvasProps {
  progressRef: React.MutableRefObject<number>;
  carSpeedRef: React.MutableRefObject<number>;
}

export function CarCanvas({ progressRef, carSpeedRef }: CarCanvasProps) {
  const reduced = useReducedMotion();

  return (
    <div className="absolute inset-0 w-full h-full">
      <Canvas
        shadows
        gl={{ antialias: !reduced, alpha: false }}
        dpr={reduced ? [1, 1] : [1, 2]}
        onCreated={({ gl, scene }) => {
          gl.toneMapping = THREE.ACESFilmicToneMapping;
          gl.toneMappingExposure = 0.55;
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
        <CarCamera />
        <color attach="background" args={['#0a0a0a']} />
        <ambientLight intensity={0.2} />
        <Suspense
          fallback={
            <Html center>
              <div className="text-muted text-sm tracking-widest uppercase">
                Loading 3D model…
              </div>
            </Html>
          }
        >
          <CarScene
            progressRef={progressRef}
            carSpeedRef={carSpeedRef}
            reduced={reduced}
          />
          {!reduced && (
            <EffectComposer>
              <Bloom
                intensity={0.4}
                luminanceThreshold={0.85}
                luminanceSmoothing={0.025}
              />
            </EffectComposer>
          )}
        </Suspense>
      </Canvas>
    </div>
  );
}
