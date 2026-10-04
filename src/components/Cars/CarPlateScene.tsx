'use client';

import { Suspense, useCallback, useEffect, useLayoutEffect, useMemo, useRef, useState, type MutableRefObject } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { CarModel } from './CarModel';
import type { ProgressSource } from './progress';
import {
  clampProgress,
  fitOrthographic,
  framingPoints,
  guidedFrame,
  inspectionFrame,
  returningFrame,
  type CameraFrame,
  type CarBounds,
  type CarMode,
  type InspectionCommand,
} from '@/lib/car-camera';

export { retryFailedCarModel } from './CarModel';

/** World units the car drives across the plate while the section scrolls. */
const TRAVEL = 0.28;
/** Framing includes the car's measured length and width plus its light pools.
 *  FIT_MARGIN reserves a border around every projected bounding-box corner. */
const FIT_MARGIN = 1.14;
/** Camera orbit: from a near-plan view above to a rear three-quarter view. */
const ORBIT_RADIUS = 20;
const CAMERA_SETTINGS = { travel: TRAVEL, margin: FIT_MARGIN, radius: ORBIT_RADIUS };

interface RigProps {
  progress: ProgressSource;
  speedRef: MutableRefObject<number>;
  reduced: boolean;
  active: boolean;
  mode: CarMode;
  finePointer: boolean;
  zoomFactor: number;
  command: InspectionCommand | null;
  composed: MutableRefObject<boolean>;
  onReturned: () => void;
}

/**
 * The car at night. The canvas is transparent so the chapter's ink background
 * is the ground; a plane of the same colour catches the headlights, which is
 * all that makes it visible. Frames render on demand: when scroll progress
 * changes and while the car is still settling toward its target.
 */
function Rig({ progress, speedRef, reduced, active, mode, finePointer, zoomFactor, command, composed, onReturned }: RigProps) {
  const group = useRef<THREE.Group>(null);
  const controls = useRef<OrbitControlsImpl>(null);
  const z = useRef(0);
  const view = useRef(progress.current); // eased 0..1 orbit progress
  const target = useRef(new THREE.Vector3());
  const lastFrame = useRef<CameraFrame | null>(null);
  const returning = useRef<{ from: CameraFrame; elapsed: number } | null>(null);
  const previousMode = useRef(mode);
  const lastCommand = useRef(-1);
  const resume = useRef(true);
  const [bounds, setBounds] = useState<CarBounds | null>(null);
  const camera = useThree((state) => state.camera) as THREE.OrthographicCamera;
  const size = useThree((state) => state.size);
  const invalidate = useThree((state) => state.invalidate);

  const captureCamera = useCallback((): CameraFrame => ({
    position: [camera.position.x, camera.position.y, camera.position.z],
    target: [target.current.x, target.current.y, target.current.z],
    zoom: camera.zoom,
    carZ: z.current,
  }), [camera]);

  const applyFrame = useCallback((frame: CameraFrame) => {
    camera.position.set(...frame.position);
    target.current.set(...frame.target);
    // Screen-up stays aligned with the sky; the near-top camera never aligns
    // exactly with this axis, so both the rig and inspection keep a stable up.
    camera.up.set(0, 1, 0);
    camera.lookAt(target.current);
    camera.zoom = frame.zoom;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    z.current = frame.carZ;
    if (group.current) group.current.position.z = z.current;
    lastFrame.current = frame;
    composed.current = true;
  }, [camera, composed]);

  const onModelReady = useCallback((model: THREE.Group) => {
    model.updateWorldMatrix(true, true);
    const box = new THREE.Box3().setFromObject(model, true);
    box.translate(new THREE.Vector3(0, 0, -z.current));
    if (box.isEmpty() || ![...box.min.toArray(), ...box.max.toArray()].every(Number.isFinite)) {
      throw new Error('The car model cannot be framed.');
    }
    setBounds({ min: [box.min.x, box.min.y, box.min.z], max: [box.max.x, box.max.y, box.max.z] });
    invalidate();
  }, [invalidate]);

  useEffect(() => progress.subscribe(() => {
    if (active && mode !== 'inspect' && !reduced) invalidate();
  }), [progress, active, mode, reduced, invalidate]);

  useLayoutEffect(() => {
    if (!active) {
      speedRef.current = 0;
      resume.current = true;
    } else {
      invalidate();
    }
    return () => { speedRef.current = 0; };
  }, [active, reduced, invalidate, speedRef]);

  useLayoutEffect(() => {
    if (mode === 'returning' && previousMode.current !== 'returning') {
      returning.current = { from: captureCamera(), elapsed: 0 };
    } else if (mode === 'inspect') {
      returning.current = null;
      speedRef.current = 0;
    }
    previousMode.current = mode;
    if (active) invalidate();
  }, [mode, active, captureCamera, invalidate, speedRef]);

  const fitInspection = useCallback(() => {
    if (!bounds || !active || mode !== 'inspect') return;
    const current = captureCamera();
    camera.zoom = fitOrthographic(framingPoints(bounds, z.current), current.position, current.target, size, FIT_MARGIN) * zoomFactor;
    camera.updateProjectionMatrix();
    camera.updateMatrixWorld();
    lastFrame.current = captureCamera();
  }, [bounds, active, mode, captureCamera, camera, size, zoomFactor]);

  useLayoutEffect(() => {
    if (!bounds || !active || mode !== 'inspect') return;
    if (command && command.id !== lastCommand.current) {
      applyFrame(inspectionFrame(bounds, size, command.view, z.current, zoomFactor, CAMERA_SETTINGS));
      controls.current?.target.copy(target.current);
      lastCommand.current = command.id;
    } else {
      fitInspection();
    }
    invalidate();
  }, [bounds, active, mode, command, zoomFactor, size, applyFrame, fitInspection, invalidate]);

  useFrame((state, delta) => {
    if (!active || !bounds || mode === 'inspect') {
      speedRef.current = 0;
      return;
    }
    const dt = Math.max(0, Math.min(delta, 0.05));

    if (mode === 'returning') {
      const transition = returning.current ?? { from: captureCamera(), elapsed: 0 };
      transition.elapsed += dt;
      returning.current = transition;
      const destination = guidedFrame(bounds, state.size, progress.current, reduced, CAMERA_SETTINGS);
      const result = returningFrame(transition.from, destination, transition.elapsed, reduced);
      applyFrame(result.frame);
      speedRef.current = 0;
      if (result.done) {
        view.current = reduced ? 1 : clampProgress(progress.current);
        returning.current = null;
        onReturned();
      } else {
        invalidate();
      }
      return;
    }

    // The car faces -z and drives forward as the reader scrolls.
    const previous = z.current;
    const p = reduced ? 1 : clampProgress(progress.current);
    const immediate = reduced || resume.current || !lastFrame.current;
    resume.current = false;
    view.current = immediate ? p : THREE.MathUtils.lerp(view.current, p, 1 - Math.exp(-9 * dt));
    const settling = Math.abs(p - view.current) > 0.0005;
    if (!settling) view.current = p;

    // Camera: plan view above the car easing down to a rear three-quarter view.
    applyFrame(guidedFrame(bounds, state.size, view.current, reduced, CAMERA_SETTINGS));
    speedRef.current = !immediate && settling && dt > 0 ? (z.current - previous) / dt : 0;
    if (settling) invalidate();
  });

  return (
    <>
      <hemisphereLight args={['#a2b1c7', '#12100f', 0.45]} />
      <directionalLight position={[-6, 9, 4]} intensity={1.25} color="#dce6f5" />
      <directionalLight position={[5, 4, -5]} intensity={0.85} color="#ede1c9" />

      {/* Ground: exactly the chapter's ink, independent of the model's lighting.
          The bounded headlamp pools are attached to the car and fade to zero,
          so their connection to the bumper remains visible without a plate edge. */}
      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -0.02, 0]}>
        <planeGeometry args={[60, 60]} />
        <meshBasicMaterial color="#111111" toneMapped={false} />
      </mesh>

      <group ref={group} rotation={[0, Math.PI, 0]}>
        <CarModel onSceneReady={onModelReady} />
        {bounds ? <Headlights bounds={bounds} /> : null}
      </group>
      {bounds && mode === 'inspect' && active && finePointer ? (
        <OrbitControls
          ref={controls}
          target={target.current}
          enablePan={false}
          enableZoom={false}
          enableDamping={false}
          autoRotate={false}
          minPolarAngle={THREE.MathUtils.degToRad(2)}
          maxPolarAngle={THREE.MathUtils.degToRad(82)}
          rotateSpeed={0.65}
          onChange={fitInspection}
        />
      ) : null}
    </>
  );
}

/** Two warm beams ahead and two red tail lamps, in the car's own space. */
function Headlights({ bounds }: { bounds: CarBounds }) {
  const leftTarget = useRef(new THREE.Object3D());
  const rightTarget = useRef(new THREE.Object3D());
  const width = bounds.max[0] - bounds.min[0];
  const length = bounds.max[2] - bounds.min[2];
  const height = bounds.max[1] - bounds.min[1];
  const front = bounds.max[2];
  const rear = bounds.min[2];
  const beamLength = length * 0.42;
  // The pool fades to the unlit floor rather than exposing its rectangle.
  // Its near edge starts at the lamp so the light is connected to the car.
  const pool = useMemo(() => new THREE.ShaderMaterial({
    transparent: true,
    depthWrite: false,
    side: THREE.DoubleSide,
    toneMapped: false,
    uniforms: { tint: { value: new THREE.Color('#fff1d6') } },
    vertexShader: 'varying vec2 vUv; void main() { vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0); }',
    fragmentShader: `varying vec2 vUv;
uniform vec3 tint;
void main() {
  float distanceAlong = 1.0 - vUv.y;
  float spread = mix(0.075, 0.5, distanceAlong);
  float edge = 1.0 - smoothstep(spread * 0.2, spread, abs(vUv.x - 0.5));
  float strength = edge * pow(1.0 - distanceAlong, 1.8) * smoothstep(0.0, 0.07, distanceAlong) * 0.32;
  gl_FragColor = vec4(tint, strength);
  #include <colorspace_fragment>
}`,
  }), []);
  useEffect(() => () => pool.dispose(), [pool]);

  useLayoutEffect(() => {
    leftTarget.current.position.set(-width * 0.33, 0.025, front + length * 0.15);
    rightTarget.current.position.set(width * 0.33, 0.025, front + length * 0.15);
  }, [width, length, front]);

  return (
    <>
      <primitive object={leftTarget.current} />
      <primitive object={rightTarget.current} />
      {[-1, 1].map((side) => (
        <mesh key={side} position={[side * width * 0.33, 0.01, front + beamLength / 2]} rotation={[-Math.PI / 2, 0, 0]} material={pool}>
          <planeGeometry args={[width * 0.65, beamLength]} />
        </mesh>
      ))}
      <spotLight
        position={[-width * 0.33, height * 0.4, front - length * 0.045]}
        target={leftTarget.current}
        color="#fff1d6"
        intensity={65}
        distance={length * 0.52}
        angle={0.38}
        penumbra={0.85}
        decay={2}
        castShadow
        shadow-mapSize={[1024, 1024]}
        shadow-bias={-0.0005}
      />
      <spotLight
        position={[width * 0.33, height * 0.4, front - length * 0.045]}
        target={rightTarget.current}
        color="#fff1d6"
        intensity={65}
        distance={length * 0.52}
        angle={0.38}
        penumbra={0.85}
        decay={2}
      />
      <pointLight position={[-width * 0.32, height * 0.45, rear + length * 0.035]} color="#ff3b2f" intensity={4} distance={length * 0.17} decay={2} />
      <pointLight position={[width * 0.32, height * 0.45, rear + length * 0.035]} color="#ff3b2f" intensity={4} distance={length * 0.17} decay={2} />
    </>
  );
}

function SceneLifecycle({ active, composed, speedRef, onReady, onError }: {
  active: boolean;
  composed: MutableRefObject<boolean>;
  speedRef: MutableRefObject<number>;
  onReady: () => void;
  onError: () => void;
}) {
  const gl = useThree((state) => state.gl);
  const scene = useThree((state) => state.scene);
  const invalidate = useThree((state) => state.invalidate);
  const ready = useRef(false);
  const failed = useRef(false);
  const ownedEnvironment = useRef<{
    target: THREE.WebGLRenderTarget;
    previous: THREE.Texture | null;
    intensity: number;
  } | null>(null);

  useLayoutEffect(() => () => {
    const environment = ownedEnvironment.current;
    if (!environment) return;
    if (scene.environment === environment.target.texture) {
      scene.environment = environment.previous;
      scene.environmentIntensity = environment.intensity;
    }
    environment.target.dispose();
    ownedEnvironment.current = null;
  }, [gl, scene]);

  useLayoutEffect(() => {
    if (!active || ownedEnvironment.current) return;
    const room = new RoomEnvironment();
    const pmrem = new THREE.PMREMGenerator(gl);
    try {
      const environment = pmrem.fromScene(room);
      ownedEnvironment.current = { target: environment, previous: scene.environment, intensity: scene.environmentIntensity };
      scene.environment = environment.texture;
      scene.environmentIntensity = 0.6;
      invalidate();
    } finally {
      pmrem.dispose();
      room.dispose();
    }
  }, [active, gl, scene, invalidate]);

  useLayoutEffect(() => {
    failed.current = false;
    const onContextLost = (event: Event) => {
      event.preventDefault();
      failed.current = true;
      speedRef.current = 0;
      onError();
    };
    const canvas = gl.domElement;
    canvas.addEventListener('webglcontextlost', onContextLost, false);
    return () => {
      canvas.removeEventListener('webglcontextlost', onContextLost, false);
      speedRef.current = 0;
    };
  }, [gl, onError, speedRef]);

  useEffect(() => {
    if (active) invalidate();
    else speedRef.current = 0;
  }, [active, invalidate, speedRef]);

  useFrame((state) => {
    if (!active || !composed.current || failed.current) return;
    try {
      state.gl.render(state.scene, state.camera);
      if (state.gl.getContext().isContextLost()) throw new Error('The WebGL context is unavailable.');
      if (!ready.current) {
        ready.current = true;
        onReady();
      }
    } catch {
      failed.current = true;
      speedRef.current = 0;
      onError();
    }
  }, 1);

  return null;
}

export interface CarPlateSceneProps extends Omit<RigProps, 'composed'> {
  onReady: () => void;
  onError: () => void;
}

export function CarPlateScene({ onReady, onError, ...props }: CarPlateSceneProps) {
  const composed = useRef(false);
  return (
    <Canvas
      frameloop={props.active ? 'demand' : 'never'}
      resize={{ scroll: false }}
      orthographic
      camera={{ position: [0, ORBIT_RADIUS, 1], near: 0.1, far: 100, up: [0, 1, 0] }}
      shadows
      dpr={[1, 1.5]}
      gl={{ alpha: true, antialias: true, powerPreference: 'high-performance' }}
      style={{ background: 'transparent', touchAction: 'pan-y pinch-zoom' }}
      onCreated={({ gl }) => {
        gl.setClearColor(0x000000, 0);
        gl.toneMapping = THREE.ACESFilmicToneMapping;
        gl.toneMappingExposure = 1.05;
        gl.outputColorSpace = THREE.SRGBColorSpace;
      }}
    >
      <SceneLifecycle active={props.active} composed={composed} speedRef={props.speedRef} onReady={onReady} onError={onError} />
      <Suspense fallback={null}>
        <Rig {...props} composed={composed} />
      </Suspense>
    </Canvas>
  );
}
