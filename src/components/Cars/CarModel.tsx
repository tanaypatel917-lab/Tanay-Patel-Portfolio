'use client';

import { useRef, useLayoutEffect } from 'react';
import { useGLTF } from '@react-three/drei';
import * as THREE from 'three';
import { asset } from '@/lib/asset';

interface CarModelProps {
  /** glTF path. The delivered file uses EXT_meshopt_compression, decoded locally by drei. */
  src?: string;
  onSceneReady?: (scene: THREE.Group, wheelMaterials: THREE.Material[]) => void;
}

function patchMaterial(material: THREE.Material) {
  const std = material as THREE.MeshStandardMaterial;
  const phys = material as THREE.MeshPhysicalMaterial;
  const matName = material.name;

  if (matName === 'EXT_Carpaint_Inst') {
    if (phys.isMeshPhysicalMaterial) {
      phys.metalness = 0.8;
      phys.roughness = 0.22;
      phys.clearcoat = 0.8;
      phys.clearcoatRoughness = 0.12;
      phys.envMapIntensity = 0.8;
    } else if (std.isMeshStandardMaterial) {
      std.metalness = 0.8;
      std.roughness = 0.22;
      std.envMapIntensity = 0.8;
    }
    return;
  }

  if (
    matName.includes('Glass') ||
    matName === 'EXT_Windows' ||
    matName === 'INT_Windshield' ||
    matName === 'INT_Glass'
  ) {
    if (phys.isMeshPhysicalMaterial) {
      phys.metalness = 0;
      phys.roughness = 0.05;
      phys.transmission = 0.95;
      phys.ior = 1.5;
      phys.thickness = 0.5;
      phys.transparent = true;
      phys.opacity = 0.3;
      phys.envMapIntensity = 0.7;
    }
    return;
  }

  if (
    matName.includes('Chrome') ||
    matName === 'INT_CHROME' ||
    matName === 'EXT_RIM' ||
    matName === 'MIRROR' ||
    matName === 'INT_METAL_GRAY' ||
    matName === 'EXT_Disc' ||
    matName === 'EXT_CALIPER'
  ) {
    if (std.isMeshStandardMaterial) {
      std.metalness = 1.0;
      std.roughness = 0.06;
      std.envMapIntensity = 1.2;
    }
    return;
  }

  if (matName === 'MI_Tyre_Flex_Dry_L') {
    if (std.isMeshStandardMaterial) {
      std.roughness = 0.9;
      std.metalness = 0.1;
      std.envMapIntensity = 0.5;
    }
    return;
  }
}

const loadedModels = new Set<string>();

export function retryFailedCarModel(src = asset('/models/car-web.glb')) {
  if (!loadedModels.has(src)) useGLTF.clear(src);
}

export function CarModel({ src = asset('/models/car-web.glb'), onSceneReady }: CarModelProps) {
  // No Draco (drei would point at a Google CDN for the decoder); meshopt decodes from the bundle.
  const { scene } = useGLTF(src, false, true);
  const root = useRef<THREE.Group>(null);

  useLayoutEffect(() => {
    const container = root.current;
    if (!container) return;
    loadedModels.add(src);
    const instance = scene.clone(true);
    const materials = new Map<THREE.Material, THREE.Material>();
    const textures = new Set<THREE.Texture>();
    const wheels: THREE.Material[] = [];
    const dispose = () => {
      container.remove(instance);
      materials.forEach((material) => material.dispose());
      textures.forEach((texture) => texture.dispose());
    };

    try {
      const cloneMaterial = (original: THREE.Material) => {
        const existing = materials.get(original);
        if (existing) return existing;
        const material = original.clone();
        materials.set(original, material);
        patchMaterial(material);
        if (material.name === 'MI_Tyre_Flex_Dry_L') {
          const standard = material as THREE.MeshStandardMaterial;
          if (standard.map) {
            standard.map = standard.map.clone();
            standard.map.needsUpdate = true;
            textures.add(standard.map);
          }
          wheels.push(material);
        }
        return material;
      };

      instance.traverse((child) => {
        if (!(child instanceof THREE.Mesh)) return;
        child.material = Array.isArray(child.material)
          ? child.material.map(cloneMaterial)
          : cloneMaterial(child.material);
        child.castShadow = true;
        child.receiveShadow = true;
      });

      instance.updateMatrixWorld(true);
      const bounds = new THREE.Box3().setFromObject(instance, true);
      if (bounds.isEmpty() || ![...bounds.min.toArray(), ...bounds.max.toArray()].every(Number.isFinite)) {
        throw new Error('The car model has no finite geometry.');
      }
      const center = bounds.getCenter(new THREE.Vector3());
      instance.position.x -= center.x;
      instance.position.y -= bounds.min.y;
      instance.position.z -= center.z;
      container.add(instance);
      container.updateWorldMatrix(true, true);
      onSceneReady?.(instance, wheels);
    } catch (error) {
      dispose();
      throw error;
    }

    return dispose;
  }, [scene, src, onSceneReady]);

  return <group ref={root} dispose={null} />;
}
