'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { CarModel } from './CarModel';
import { Road } from './Road';
import { CarLighting } from './CarLighting';

interface CarSceneProps {
  progressRef: React.MutableRefObject<number>;
  carSpeedRef: React.MutableRefObject<number>;
  reduced?: boolean;
}

const easeInOutCubic = (t: number) =>
  t < 0.5 ? 4 * t * t * t : 1 - Math.pow(-2 * t + 2, 3) / 2;

export function CarScene({
  progressRef,
  carSpeedRef,
  reduced = false,
}: CarSceneProps) {
  const carGroup = useRef<THREE.Group>(null);
  const headlightsOn = useRef(false);
  const wheelMatsRef = useRef<THREE.Material[]>([]);

  const carZ = useRef(-12);
  const targetCarZ = useRef(-12);

  const progressToCarZ = useMemo(() => {
    return (p: number) => {
      if (p < 0.2) return THREE.MathUtils.lerp(-12, -4, p / 0.2);
      if (p < 0.4)
        return THREE.MathUtils.lerp(-4, 0, easeInOutCubic((p - 0.2) / 0.2));
      if (p < 0.6) return 0;
      if (p < 0.8) return 0;
      return THREE.MathUtils.lerp(0, 12, easeInOutCubic((p - 0.8) / 0.2));
    };
  }, []);

  useFrame((state, dt) => {
    const camera = state.camera;
    const p = reduced ? 0.5 : Math.max(0, Math.min(1, progressRef.current));
    targetCarZ.current = reduced ? 0 : progressToCarZ(p);

    const prev = carZ.current;
    carZ.current = reduced
      ? 0
      : THREE.MathUtils.lerp(
          carZ.current,
          targetCarZ.current,
          1 - Math.exp(-8 * dt)
        );
    carSpeedRef.current = reduced ? 0 : (carZ.current - prev) / (dt || 0.016);

    if (carGroup.current) {
      carGroup.current.position.z = carZ.current;
      if (!reduced && p > 0.35 && p < 0.85) {
        carGroup.current.position.x = Math.sin(state.clock.elapsedTime * 20) * 0.003;
      } else {
        carGroup.current.position.x = 0;
      }
    }

    // Camera tracks the car from above, keeping it centred
    const targetCamZ = carZ.current;
    camera.position.z = reduced
      ? 0
      : THREE.MathUtils.lerp(camera.position.z, targetCamZ, 1 - Math.exp(-6 * dt));
    camera.lookAt(0, 0, carZ.current);

    const targetZoom = reduced ? 2.88 : 2.88 - p * 0.6 + (p > 0.4 && p < 0.8 ? 0.8 : 0);
    if ((camera as THREE.OrthographicCamera).isOrthographicCamera) {
      const oc = camera as THREE.OrthographicCamera;
      oc.zoom = THREE.MathUtils.lerp(oc.zoom, targetZoom, 1 - Math.exp(-5 * dt));
      oc.updateProjectionMatrix();
    }

    headlightsOn.current = !reduced && p > 0.58;

    const distance = carZ.current - prev;
    for (const mat of wheelMatsRef.current) {
      const stdMat = mat as THREE.MeshStandardMaterial;
      if (stdMat.map) {
        stdMat.map.offset.y -= distance * 0.05;
      }
    }
  });

  return (
    <>
      <CarLighting headlightsOn={headlightsOn} />
      <Road carZ={carZ} />
      <group ref={carGroup} position={[0, 0.05, -12]}>
        <CarModel
          onSceneReady={(_, wheelMats) => {
            wheelMatsRef.current = wheelMats;
          }}
        />
      </group>
    </>
  );
}
