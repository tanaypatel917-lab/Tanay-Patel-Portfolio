'use client';

import { useRef } from 'react';
import { useTexture } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

interface RoadProps {
  carZ: React.MutableRefObject<number>;
}

export function Road({ carZ }: RoadProps) {
  const texture = useTexture('/textures/road.png');
  const meshRef = useRef<THREE.Mesh>(null);

  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(2, 8);
  texture.anisotropy = 16;
  texture.colorSpace = THREE.SRGBColorSpace;

  useFrame(() => {
    if (texture) {
      texture.offset.y = -carZ.current * 0.08;
    }
  });

  return (
    <mesh
      ref={meshRef}
      position={[0, -0.04, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      receiveShadow
    >
      <planeGeometry args={[40, 120]} />
      <meshStandardMaterial
        map={texture}
        roughness={0.85}
        metalness={0}
        color="#1f1f1f"
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
