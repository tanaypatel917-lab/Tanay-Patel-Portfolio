'use client';

import { useLayoutEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';

interface KeyboardModelProps {
  onSceneReady?: (scene: THREE.Group) => void;
}

function patchMaterial(material: THREE.Material) {
  const std = material as THREE.MeshStandardMaterial;
  const phys = material as THREE.MeshPhysicalMaterial;
  const matName = material.name;

  if (matName.includes('Polycarbonate')) {
    if (phys.isMeshPhysicalMaterial) {
      phys.roughness = 0.2;
      phys.metalness = 0.0;
      phys.transmission = 0.05;
      phys.thickness = 0.2;
      phys.transparent = true;
      phys.opacity = 0.85;
      phys.envMapIntensity = 0.5;
    }
    return;
  }

  if (
    matName.includes('Plate_Metal') ||
    matName.includes('Alumunium') ||
    matName.includes('Aluminium') ||
    matName.includes('Knob')
  ) {
    if (std.isMeshStandardMaterial) {
      std.metalness = 0.95;
      std.roughness = 0.15;
      std.envMapIntensity = 1.0;
    }
    return;
  }

  if (matName.includes('Keys') || matName === 'Space' || matName.includes('Shift') || matName.includes('Arrow')) {
    if (std.isMeshStandardMaterial) {
      std.roughness = 0.55;
      std.metalness = 0.0;
      std.envMapIntensity = 0.6;
    }
    return;
  }

  if (std.isMeshStandardMaterial) {
    std.roughness = 0.7;
    std.metalness = 0.1;
    std.envMapIntensity = 0.5;
  }
}

export function KeyboardModel({ onSceneReady }: KeyboardModelProps) {
  const { scene } = useGLTF('/models/keyboard.glb');
  const patchedRef = useRef(false);

  useLayoutEffect(() => {
    if (patchedRef.current) return;
    patchedRef.current = true;

    scene.traverse((child) => {
      if (!(child instanceof THREE.Mesh)) return;
      const material = child.material as THREE.MeshStandardMaterial;
      if (!material?.name) return;
      patchMaterial(material);
    });

    onSceneReady?.(scene);
  }, [scene, onSceneReady]);

  return <primitive object={scene} />;
}
