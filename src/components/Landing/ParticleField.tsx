'use client';

import { useRef, useMemo } from 'react';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';

const COUNT = 2000;
const VERTEX_SHADER = `
  attribute float aSize;
  attribute vec3 aColor;
  attribute float aSpeed;
  varying vec3 vColor;
  varying float vDepth;
  uniform float uTime;

  void main() {
    vec3 pos = position;
    pos.x += mod(uTime * aSpeed * 0.02, 40.0) - 20.0;
    pos.y += sin(uTime * aSpeed * 0.01 + position.x) * 0.15;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aSize * (80.0 / -mvPosition.z);

    vColor = aColor;
    vDepth = -mvPosition.z;
  }
`;

const FRAGMENT_SHADER = `
  varying vec3 vColor;
  varying float vDepth;

  void main() {
    float dist = length(gl_PointCoord - vec2(0.5));
    if (dist > 0.5) discard;

    float alpha = 1.0 - smoothstep(2.0, 18.0, vDepth);
    float falloff = 1.0 - smoothstep(0.0, 0.5, dist);

    gl_FragColor = vec4(vColor, alpha * falloff * 0.8);
  }
`;

export function ParticleField() {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, colors, sizes, speeds } = useMemo(() => {
    const positions = new Float32Array(COUNT * 3);
    const colors = new Float32Array(COUNT * 3);
    const sizes = new Float32Array(COUNT);
    const speeds = new Float32Array(COUNT);

    for (let i = 0; i < COUNT; i++) {
      positions[i * 3] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 1] = (Math.random() - 0.5) * 40;
      positions[i * 3 + 2] = (Math.random() - 0.5) * 20;

      const isBlue = Math.random() > 0.7;
      colors[i * 3] = isBlue ? 0.2 : 1.0;
      colors[i * 3 + 1] = isBlue ? 0.45 : 1.0;
      colors[i * 3 + 2] = isBlue ? 1.0 : 1.0;

      sizes[i] = 0.03 + Math.random() * 0.08;
      speeds[i] = 0.5 + Math.random() * 1.5;
    }

    return { positions, colors, sizes, speeds };
  }, []);

  useFrame(({ clock }) => {
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    }
  });

  return (
    <points ref={pointsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
        <bufferAttribute attach="attributes-aColor" args={[colors, 3]} />
        <bufferAttribute attach="attributes-aSize" args={[sizes, 1]} />
        <bufferAttribute attach="attributes-aSpeed" args={[speeds, 1]} />
      </bufferGeometry>
      <shaderMaterial
        ref={materialRef}
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={{
          uTime: { value: 0 },
        }}
      />
    </points>
  );
}
