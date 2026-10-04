'use client';

import { useRef } from 'react';
import { ContactShadows } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface CarLightingProps {
  headlightsOn: React.MutableRefObject<boolean>;
}

export function CarLighting({ headlightsOn }: CarLightingProps) {
  const keyLight = useRef<THREE.DirectionalLight>(null);
  const frontLight = useRef<THREE.PointLight>(null);
  const rearLight = useRef<THREE.PointLight>(null);

  useFrame(() => {
    if (frontLight.current) {
      frontLight.current.intensity = THREE.MathUtils.lerp(
        frontLight.current.intensity,
        headlightsOn.current ? 1.8 : 0,
        0.1
      );
    }
    if (rearLight.current) {
      rearLight.current.intensity = THREE.MathUtils.lerp(
        rearLight.current.intensity,
        headlightsOn.current ? 0.8 : 0,
        0.1
      );
    }
  });

  return (
    <>
      <ambientLight intensity={0.2} />
      <directionalLight
        ref={keyLight}
        position={[5, 12, 15]}
        intensity={0.9}
        color="#fff4e6"
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-near={0.1}
        shadow-camera-far={50}
        shadow-camera-left={-15}
        shadow-camera-right={15}
        shadow-camera-top={15}
        shadow-camera-bottom={-15}
      />
      <directionalLight
        position={[-8, 3, 12]}
        intensity={0.35}
        color="#aaccff"
      />
      <directionalLight
        position={[-3, 12, -2]}
        intensity={0.2}
        color="#e8e8e8"
      />
      <pointLight
        ref={frontLight}
        position={[0, 0.7, 2.4]}
        color="#fffce0"
        intensity={headlightsOn.current ? 1.8 : 0}
        distance={12}
        decay={2}
      />
      <pointLight
        ref={rearLight}
        position={[0, 0.7, -2.4]}
        color="#ff4a4a"
        intensity={headlightsOn.current ? 0.8 : 0}
        distance={8}
        decay={2}
      />
      <ContactShadows
        position={[0, -0.03, 0]}
        opacity={0.7}
        scale={12}
        blur={2.5}
        far={5}
        resolution={1024}
      />
    </>
  );
}
