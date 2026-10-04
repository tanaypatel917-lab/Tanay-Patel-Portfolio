'use client';

import { useRef, useEffect } from 'react';
import { OrthographicCamera } from '@react-three/drei';
import * as THREE from 'three';

export function CarCamera() {
  const camRef = useRef<THREE.OrthographicCamera>(null);

  useEffect(() => {
    if (camRef.current) {
      camRef.current.up.set(0, 0, -1);
      camRef.current.lookAt(0, 0, 0);
    }
  }, []);

  return (
    <OrthographicCamera
      ref={camRef}
      makeDefault
      position={[0, 18, 0]}
      zoom={2.88}
      left={-8}
      right={8}
      top={8}
      bottom={-8}
      near={0.1}
      far={100}
    />
  );
}
