import { Component, Suspense, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { ContactShadows, Float, RoundedBox, useTexture } from '@react-three/drei';
import { useReducedMotion } from 'framer-motion';
import * as THREE from 'three';

function Hero3DFallback() {
  return (
    <div className="mx-auto max-w-[440px] rounded-2xl border-[6px] border-[#18201c] bg-[#131614] p-2 shadow-[0_24px_60px_-18px_rgba(17,22,19,0.28)]">
      <img
        src="./images/screen-today-dark.jpg"
        alt="PocketPal Today screen in Dark Mode showing ₹19,500.00 available this cycle."
        width={1024}
        height={907}
        fetchPriority="high"
        className="block h-auto w-full rounded-xl select-none"
      />
    </div>
  );
}

class WebGLErrorBoundary extends Component<
  { children: ReactNode; fallback: ReactNode },
  { hasError: boolean }
> {
  state = { hasError: false };
  static getDerivedStateFromError() {
    return { hasError: true };
  }
  render() {
    return this.state.hasError ? this.props.fallback : this.props.children;
  }
}

function PocketPalArtifact({
  reducedMotion,
  boostSpin,
}: {
  reducedMotion: boolean;
  boostSpin: number;
}) {
  const groupRef = useRef<THREE.Group>(null);
  const coinRef = useRef<THREE.Group>(null);
  const torusRef = useRef<THREE.Mesh>(null);
  const haloRef = useRef<THREE.Mesh>(null);
  const screenTexture = useTexture('./images/screen-today-dark.jpg');
  screenTexture.colorSpace = THREE.SRGBColorSpace;
  screenTexture.anisotropy = 8;

  useFrame((state, delta) => {
    if (!groupRef.current) return;
    const scrollProgress =
      typeof window !== 'undefined' ? Math.min(window.scrollY / 600, 1) : 0;

    if (reducedMotion) {
      groupRef.current.rotation.y = -0.18 + scrollProgress * 0.25;
      groupRef.current.rotation.x = 0.06;
      return;
    }

    const targetY =
      state.pointer.x * 0.34 - 0.16 + scrollProgress * 0.5 + boostSpin * Math.PI * 2;
    const targetX = -state.pointer.y * 0.22 + 0.06 + scrollProgress * 0.14;

    groupRef.current.rotation.y = THREE.MathUtils.lerp(
      groupRef.current.rotation.y,
      targetY,
      Math.min(delta * 5, 1)
    );
    groupRef.current.rotation.x = THREE.MathUtils.lerp(
      groupRef.current.rotation.x,
      targetX,
      Math.min(delta * 5, 1)
    );

    if (coinRef.current) {
      coinRef.current.rotation.y += delta * 0.85;
    }
    if (torusRef.current) {
      torusRef.current.rotation.z += delta * 0.45;
      torusRef.current.rotation.x += delta * 0.25;
    }
    if (haloRef.current) {
      haloRef.current.rotation.z -= delta * 0.18;
    }
  });

  const screenW = 2.8;
  const screenH = 2.48;

  return (
    <>
      <ambientLight intensity={1.15} />
      <directionalLight position={[4, 6, 5]} intensity={1.9} color="#fffcf5" />
      <directionalLight position={[-4, -2, 3]} intensity={0.85} color="#52b792" />

      <group ref={groupRef}>
        <Float
          speed={reducedMotion ? 0 : 1.9}
          rotationIntensity={reducedMotion ? 0 : 0.14}
          floatIntensity={reducedMotion ? 0 : 0.3}
        >
          {/* Orbiting Outer Mint Halo */}
          <mesh ref={haloRef} position={[0, 0, -0.35]} rotation={[0.25, 0.1, 0]}>
            <torusGeometry args={[2.05, 0.018, 16, 80]} />
            <meshStandardMaterial
              color="#52b792"
              roughness={0.2}
              metalness={0.6}
              transparent
              opacity={0.75}
            />
          </mesh>

          {/* Device Chassis */}
          <RoundedBox args={[screenW + 0.24, screenH + 0.24, 0.16]} radius={0.14} smoothness={4}>
            <meshStandardMaterial color="#18201c" roughness={0.32} metalness={0.5} />
          </RoundedBox>

          {/* Inner Bezel */}
          <RoundedBox
            args={[screenW + 0.08, screenH + 0.08, 0.17]}
            radius={0.1}
            smoothness={4}
            position={[0, 0, 0.005]}
          >
            <meshStandardMaterial color="#253229" roughness={0.45} metalness={0.25} />
          </RoundedBox>

          {/* High-res PocketPal Today Dark Screen */}
          <mesh position={[0, 0, 0.095]}>
            <planeGeometry args={[screenW, screenH]} />
            <meshBasicMaterial map={screenTexture} toneMapped={false} />
          </mesh>

          {/* Tactile 3D Ochre Coin */}
          <group ref={coinRef} position={[1.65, 1.05, 0.38]}>
            <mesh rotation={[Math.PI / 2, 0, 0]}>
              <cylinderGeometry args={[0.34, 0.34, 0.08, 36]} />
              <meshStandardMaterial color="#c9975b" roughness={0.25} metalness={0.75} />
            </mesh>
            <mesh position={[0, 0, 0.045]}>
              <torusGeometry args={[0.18, 0.025, 12, 32]} />
              <meshStandardMaterial color="#f6f5f0" roughness={0.3} metalness={0.5} />
            </mesh>
          </group>

          {/* Mint Savings Torus */}
          <mesh ref={torusRef} position={[-1.62, -0.88, 0.42]}>
            <torusGeometry args={[0.28, 0.085, 20, 48]} />
            <meshStandardMaterial color="#52b792" roughness={0.22} metalness={0.4} />
          </mesh>

          {/* Forest Ledger Prism */}
          <mesh position={[-1.5, 1.12, 0.25]} rotation={[0.5, 0.6, 0.2]}>
            <octahedronGeometry args={[0.24, 0]} />
            <meshStandardMaterial color="#1b4d41" roughness={0.28} metalness={0.45} />
          </mesh>
        </Float>
      </group>

      <ContactShadows
        position={[0, -1.78, 0]}
        opacity={0.3}
        scale={7.2}
        blur={2.4}
        far={3.5}
        color="#111613"
      />
    </>
  );
}

export function Hero3DScene() {
  const prefersReduced = useReducedMotion() ?? false;
  const [spinCount, setSpinCount] = useState(0);

  return (
    <WebGLErrorBoundary fallback={<Hero3DFallback />}>
      <div
        onClick={() => setSpinCount((c) => c + 1)}
        className="relative mx-auto aspect-[10/9] w-full max-w-[500px] cursor-pointer overflow-hidden"
        title="Click to spin 3D artifact"
      >
        <Suspense fallback={<Hero3DFallback />}>
          <Canvas
            dpr={[1, 2]}
            style={{ width: '100%', height: '100%', display: 'block' }}
            camera={{ position: [0, 0, 5.5], fov: 45 }}
            gl={{ antialias: true, alpha: true }}
            aria-label="Interactive 3D PocketPal device showing Dark Mode Today screen and floating 3D financial artifacts"
          >
            <PocketPalArtifact reducedMotion={prefersReduced} boostSpin={spinCount} />
          </Canvas>
        </Suspense>
        <p className="mt-1 text-center font-mono text-[11px] text-ink-muted">
          Interactive 3D · Move pointer, scroll, or click to spin
        </p>
      </div>
    </WebGLErrorBoundary>
  );
}
