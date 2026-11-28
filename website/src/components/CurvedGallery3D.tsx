import { Component, Suspense, useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useReducedMotion, useScroll } from 'framer-motion';
import * as THREE from 'three';
import { Download } from 'lucide-react';
import { LINKS } from '../data/content';

interface GallerySlide {
  id: string;
  label: string;
  subtitle: string;
  image?: string;
  cardSpec?: {
    eyebrow: string;
    title: string;
    metric: string;
    caption: string;
    bullets: string[];
    dark?: boolean;
  };
}

const SLIDES: GallerySlide[] = [
  {
    id: 'today-dark',
    label: 'Today · Dark Mode',
    subtitle: 'Remaining cycle balance, top-ups & reset countdown',
    image: './images/screen-today-dark.jpg',
  },
  {
    id: 'flexible-cycles',
    label: 'v1.4.17 · Cycle Modes',
    subtitle: 'Reversible Monthly Cycle ↔ No Fixed Cycle switching',
    cardSpec: {
      eyebrow: 'NEW IN v1.4.17',
      title: 'Budgeting Modes',
      metric: 'Monthly ↔ Flexible',
      caption:
        'Switch between Monthly Cycle and No Fixed Cycle anytime—balance and history stay intact.',
      bullets: ['Reversible transitions', 'Zero history loss', 'Cycle days 1–28'],
      dark: false,
    },
  },
  {
    id: 'insights-behaviour',
    label: 'Insights · Reflections',
    subtitle: 'Compare Mindful vs. Impulse spending without guilt',
    image: './images/screen-insights-behaviour.jpg',
  },
  {
    id: 'optional-logs',
    label: 'v1.4.17 · Quick Log',
    subtitle: 'Optional descriptions & synchronized income top-ups',
    cardSpec: {
      eyebrow: '2-TAP LOGGING',
      title: 'Optional Notes',
      metric: 'Unspecified Expense',
      caption:
        'Leave descriptions blank when in a hurry—entries default cleanly and sync everywhere.',
      bullets: ['Optional descriptions', 'Income cycle top-ups', 'Dashboard & Activity sync'],
      dark: true,
    },
  },
  {
    id: 'goals',
    label: 'Goals · Savings',
    subtitle: 'Dedicated targets with deposits & withdrawal history',
    image: './images/screen-goals.jpg',
  },
  {
    id: 'offline-sqlite',
    label: 'Local SQLite',
    subtitle: 'On-device storage with CSV export & JSON backup',
    cardSpec: {
      eyebrow: 'PRIVATE BY DESIGN',
      title: '100% On-Device',
      metric: '0 Cloud Trackers',
      caption:
        'Your ledger lives in local SQLite on Android—no bank logins, no accounts, no telemetry.',
      bullets: ['Export CSV spreadsheets', 'Full JSON backup/restore', 'Integer minor-unit math'],
      dark: false,
    },
  },
];

function createCardTexture(spec: NonNullable<GallerySlide['cardSpec']>): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 920;
  canvas.height = 1280;
  const ctx = canvas.getContext('2d')!;

  const isDark = Boolean(spec.dark);
  const bg = isDark ? '#18201b' : '#f6f5f0';
  const surface = isDark ? '#222d26' : '#ffffff';
  const ink = isDark ? '#eef3ee' : '#18201c';
  const muted = isDark ? '#96a59c' : '#56645e';
  const accent = isDark ? '#52b792' : '#1b4d41';
  const border = isDark ? '#2f3f35' : '#dfe3dc';

  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, canvas.width, canvas.height);

  ctx.fillStyle = accent;
  ctx.fillRect(64, 72, 120, 8);

  ctx.fillStyle = accent;
  ctx.font = '700 28px "JetBrains Mono", monospace';
  ctx.fillText(spec.eyebrow, 64, 148);

  ctx.fillStyle = ink;
  ctx.font = '700 68px "Plus Jakarta Sans", sans-serif';
  ctx.fillText(spec.title, 64, 240);

  ctx.fillStyle = surface;
  ctx.strokeStyle = border;
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.roundRect(64, 300, 792, 340, 28);
  ctx.fill();
  ctx.stroke();

  ctx.fillStyle = accent;
  ctx.font = '700 54px "JetBrains Mono", monospace';
  ctx.fillText(spec.metric, 108, 415);

  ctx.fillStyle = muted;
  ctx.font = '400 32px "Plus Jakarta Sans", sans-serif';
  const words = spec.caption.split(' ');
  let line = '';
  let y = 490;
  for (const w of words) {
    const test = line ? `${line} ${w}` : w;
    if (ctx.measureText(test).width > 700) {
      ctx.fillText(line, 108, y);
      line = w;
      y += 46;
    } else {
      line = test;
    }
  }
  if (line) ctx.fillText(line, 108, y);

  let by = 710;
  for (const bullet of spec.bullets) {
    ctx.fillStyle = surface;
    ctx.strokeStyle = border;
    ctx.beginPath();
    ctx.roundRect(64, by, 792, 118, 22);
    ctx.fill();
    ctx.stroke();

    ctx.fillStyle = accent;
    ctx.beginPath();
    ctx.arc(118, by + 59, 12, 0, Math.PI * 2);
    ctx.fill();

    ctx.fillStyle = ink;
    ctx.font = '600 34px "Plus Jakarta Sans", sans-serif';
    ctx.fillText(bullet, 156, by + 71);
    by += 146;
  }

  ctx.fillStyle = muted;
  ctx.font = '500 26px "JetBrains Mono", monospace';
  ctx.fillText('POCKETPAL · ANDROID v1.4.17', 64, 1210);

  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 8;
  return tex;
}

// Swirl & Double-Sided Sheet Vertex Shader inspired by animaticss.com
const VERTEX_SHADER = /* glsl */ `
  uniform float uVelocity;
  uniform float uOffset;
  uniform float uTime;
  uniform float uHover;
  varying vec2 vUv;
  varying float vShade;

  mat2 rot2d(float a) {
    float s = sin(a);
    float c = cos(a);
    return mat2(c, -s, s, c);
  }

  void main() {
    vUv = uv;
    vec3 pos = position;

    // When hovered (uHover -> 1.0), uncoil completely flat so the image is 100% readable
    float curlStrength = 1.0 - uHover;

    float nx = (uv.x - 0.5) * 2.0;
    float ny = (uv.y - 0.5) * 2.0;

    float distFactor = clamp(abs(uOffset) * 0.36, 0.0, 1.8);
    float swirlDir = sign(uOffset + 0.0001);

    // 1. Helical diagonal twist along Y
    float twistAngle = (ny * 0.55 + nx * 0.25) * (0.45 + distFactor * 0.85 + abs(uVelocity) * 0.35) * swirlDir * curlStrength;
    pos.xz = rot2d(twistAngle) * pos.xz;

    // 2. Cylindrical / S-wave sheet arch in Z
    float arch = sin(nx * 2.1 + uOffset * 0.55 + uTime * 0.35) * (0.28 + distFactor * 0.22) * curlStrength;
    float verticalCurl = cos(ny * 1.8 - uOffset * 0.4) * (0.18 + abs(uVelocity) * 0.22) * curlStrength;
    pos.z += arch + verticalCurl;

    // 3. Gentle swirl lift in Y
    pos.y += sin(uOffset * 0.55 + nx * 0.6) * 0.26 * curlStrength;

    vShade = mix(0.88 + 0.12 * cos(twistAngle), 1.0, uHover);

    gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
  }
`;

const FRAGMENT_SHADER = /* glsl */ `
  uniform sampler2D uTexture;
  uniform float uDim;
  varying vec2 vUv;
  varying float vShade;

  void main() {
    vec4 tex = texture2D(uTexture, vUv);

    // Back face renders as warm tactile paper (#f6f5f0) with subtle forest shadow,
    // matching the crisp white/paper inner-curl look in the reference video
    vec3 paperBack = vec3(0.965, 0.961, 0.941) * (0.85 + 0.15 * vShade);
    vec3 frontColor = tex.rgb * vShade * mix(0.75, 1.0, uDim);

    vec3 finalRgb = gl_FrontFacing ? frontColor : paperBack;
    gl_FragColor = vec4(finalRgb, tex.a);
  }
`;

function SwirlSheet({
  slide,
  index,
  progressRef,
  velocityRef,
  onSelect,
}: {
  slide: GallerySlide;
  index: number;
  progressRef: React.MutableRefObject<number>;
  velocityRef: React.MutableRefObject<number>;
  onSelect: (idx: number) => void;
}) {
  const meshRef = useRef<THREE.Mesh>(null);
  const [hovered, setHovered] = useState(false);
  const hoverVal = useRef(0);
  const { viewport } = useThree();

  const texture = useMemo(() => {
    if (slide.image) {
      const loader = new THREE.TextureLoader();
      const t = loader.load(slide.image);
      t.colorSpace = THREE.SRGBColorSpace;
      t.anisotropy = 8;
      return t;
    }
    return createCardTexture(slide.cardSpec!);
  }, [slide]);

  const uniforms = useMemo(
    () => ({
      uTexture: { value: texture },
      uVelocity: { value: 0 },
      uOffset: { value: 0 },
      uTime: { value: 0 },
      uDim: { value: 1 },
      uHover: { value: 0 },
    }),
    [texture]
  );

  useEffect(() => {
    return () => {
      texture.dispose();
    };
  }, [texture]);

  useEffect(() => {
    if (!hovered) return;
    const prev = document.body.style.cursor;
    document.body.style.cursor = 'pointer';
    return () => {
      document.body.style.cursor = prev;
    };
  }, [hovered]);

  const spacing = viewport.width < 6 ? 2.35 : 2.85;
  const isWide = slide.id === 'today-dark';
  const cardW = isWide ? 2.25 : 1.75;
  const cardH = isWide ? 2.0 : 2.75;

  useFrame((state, delta) => {
    if (!meshRef.current) return;
    hoverVal.current = THREE.MathUtils.lerp(
      hoverVal.current,
      hovered ? 1 : 0,
      Math.min(delta * 9, 1)
    );
    const h = hoverVal.current;

    const offset = (index - progressRef.current) * spacing;

    // Sweeping 3D helical arc position; hovered sheet steps forward and centers vertically
    meshRef.current.position.x = offset;
    const baseZ = -Math.pow(Math.abs(offset) * 0.34, 1.45) + 0.25;
    meshRef.current.position.z = THREE.MathUtils.lerp(baseZ, 1.05, h);
    const baseY = Math.sin(offset * 0.45 + state.clock.elapsedTime * 0.5) * 0.14;
    meshRef.current.position.y = THREE.MathUtils.lerp(baseY, 0, h);

    // Unrotate completely to face viewer cleanly on hover
    meshRef.current.rotation.y = THREE.MathUtils.lerp(-offset * 0.24, 0, h);
    meshRef.current.rotation.z = THREE.MathUtils.lerp(Math.sin(offset * 0.35) * 0.14, 0, h);
    meshRef.current.rotation.x = THREE.MathUtils.lerp(Math.cos(offset * 0.3) * 0.08, 0, h);

    const scale = 1 + 0.14 * h;
    meshRef.current.scale.set(scale, scale, 1);

    const mat = meshRef.current.material as THREE.ShaderMaterial;
    mat.uniforms.uOffset.value = offset;
    mat.uniforms.uVelocity.value = velocityRef.current;
    mat.uniforms.uTime.value = state.clock.elapsedTime;
    mat.uniforms.uHover.value = h;
    const baseDim = Math.max(0.45, 1 - Math.abs(index - progressRef.current) * 0.3);
    mat.uniforms.uDim.value = THREE.MathUtils.lerp(baseDim, 1.0, h);
  });

  return (
    <mesh
      ref={meshRef}
      onPointerOver={(e) => {
        e.stopPropagation();
        setHovered(true);
      }}
      onPointerOut={(e) => {
        e.stopPropagation();
        setHovered(false);
      }}
      onClick={(e) => {
        e.stopPropagation();
        onSelect(index);
      }}
    >
      <planeGeometry args={[cardW, cardH, 40, 40]} />
      <shaderMaterial
        vertexShader={VERTEX_SHADER}
        fragmentShader={FRAGMENT_SHADER}
        uniforms={uniforms}
        side={THREE.DoubleSide}
        transparent
      />
    </mesh>
  );
}

function SwirlRibbonScene({
  targetProgress,
  onActiveChange,
  onSelectSlide,
}: {
  targetProgress: React.MutableRefObject<number>;
  onActiveChange: (idx: number) => void;
  onSelectSlide: (idx: number) => void;
}) {
  const smoothProgress = useRef(0);
  const velocity = useRef(0);
  const lastReported = useRef(0);

  useFrame((_, delta) => {
    const prev = smoothProgress.current;
    smoothProgress.current = THREE.MathUtils.lerp(
      prev,
      targetProgress.current,
      Math.min(delta * 6.5, 1)
    );
    const rawVel = (smoothProgress.current - prev) / Math.max(delta, 0.008);
    velocity.current = THREE.MathUtils.lerp(
      velocity.current,
      THREE.MathUtils.clamp(rawVel * 0.2, -1.8, 1.8),
      Math.min(delta * 7, 1)
    );

    const nearest = Math.max(
      0,
      Math.min(SLIDES.length - 1, Math.round(smoothProgress.current))
    );
    if (nearest !== lastReported.current) {
      lastReported.current = nearest;
      onActiveChange(nearest);
    }
  });

  return (
    <>
      {SLIDES.map((slide, idx) => (
        <SwirlSheet
          key={slide.id}
          slide={slide}
          index={idx}
          progressRef={smoothProgress}
          velocityRef={velocity}
          onSelect={onSelectSlide}
        />
      ))}
    </>
  );
}

class GalleryErrorBoundary extends Component<
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

function StaticGalleryFallback() {
  return (
    <div className="mx-auto grid max-w-5xl gap-6 px-4 py-12 sm:grid-cols-3">
      <img
        src="./images/screen-insights-behaviour.jpg"
        alt="PocketPal Insights Behaviour"
        className="mx-auto w-full max-w-[240px] rounded-2xl border border-[#253229]"
      />
      <img
        src="./images/screen-today-dark.jpg"
        alt="PocketPal Today Dark Mode"
        className="mx-auto w-full max-w-[300px] self-center rounded-2xl border border-[#253229]"
      />
      <img
        src="./images/screen-goals.jpg"
        alt="PocketPal Savings Goals"
        className="mx-auto w-full max-w-[240px] rounded-2xl border border-[#253229]"
      />
    </div>
  );
}

export function CurvedGallery3D() {
  const prefersReduced = useReducedMotion();
  const containerRef = useRef<HTMLDivElement>(null);
  const targetProgress = useRef(0);
  const dragOffset = useRef(0);
  const isDragging = useRef(false);
  const dragStartX = useRef(0);
  const [activeIndex, setActiveIndex] = useState(0);

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  useEffect(() => {
    const unsub = scrollYProgress.on('change', (v) => {
      const base = v * (SLIDES.length - 1);
      targetProgress.current = THREE.MathUtils.clamp(
        base + dragOffset.current,
        0,
        SLIDES.length - 1
      );
    });
    return () => unsub();
  }, [scrollYProgress]);

  const jumpToSlide = (idx: number) => {
    const clamped = Math.max(0, Math.min(SLIDES.length - 1, idx));
    const currentScrollBase = scrollYProgress.get() * (SLIDES.length - 1);
    dragOffset.current = clamped - currentScrollBase;
    targetProgress.current = clamped;
    setActiveIndex(clamped);
  };

  if (prefersReduced) {
    return (
      <section
        id="showcase"
        aria-labelledby="showcase-heading"
        className="dark-surface border-b border-[#253229] bg-forest-deep py-16 text-[#eef3ee]"
      >
        <div className="mx-auto max-w-6xl px-4 text-center">
          <p className="font-mono text-xs font-bold tracking-[0.14em] text-mint uppercase">
            App &amp; Release Gallery
          </p>
          <h2 id="showcase-heading" className="mt-2 text-3xl font-bold">
            Inside PocketPal {LINKS.version}
          </h2>
          <StaticGalleryFallback />
        </div>
      </section>
    );
  }

  const activeSlide = SLIDES[activeIndex];

  return (
    <section
      id="showcase"
      ref={containerRef}
      aria-labelledby="showcase-heading"
      className="dark-surface relative h-[260vh] scroll-mt-16 border-b border-[#253229] bg-forest-deep text-[#eef3ee]"
    >
      <div className="sticky top-16 flex h-[calc(100dvh-4rem)] flex-col justify-between overflow-hidden py-5 sm:py-6">
        {/* Top Editorial HUD */}
        <div className="relative z-10 mx-auto flex w-full max-w-6xl items-center justify-between px-4 font-mono text-[11px] tracking-[0.14em] text-[#96a59c] uppercase sm:px-8">
          <span>/ POCKETPAL {LINKS.version}</span>
          <h2 id="showcase-heading" className="font-semibold text-[#eef3ee]">
            3D SWIRL GALLERY
          </h2>
          <a
            href={LINKS.apkDownload}
            className="inline-flex items-center gap-1.5 text-mint transition-colors hover:text-white"
          >
            <Download className="h-3.5 w-3.5" aria-hidden="true" />
            <span className="hidden sm:inline">GET APK</span>
          </a>
        </div>

        {/* Center Background Marquee Ribbon (matching reference video center text) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-1/2 -translate-y-1/2 overflow-hidden opacity-[0.07] select-none"
        >
          <div className="whitespace-nowrap font-mono text-5xl font-bold tracking-[0.18em] text-[#eef3ee] uppercase sm:text-7xl">
            POCKETPAL · OFFLINE SQLITE · ADAPTIVE PACING · FLEXIBLE CYCLES · ZERO BANK LOGINS ·
          </div>
        </div>

        {/* Full-Bleed 3D WebGL Swirl Ribbon */}
        <div
          className="relative z-10 my-auto h-[62dvh] w-full cursor-grab active:cursor-grabbing"
          onPointerDown={(e) => {
            isDragging.current = true;
            dragStartX.current = e.clientX;
          }}
          onPointerMove={(e) => {
            if (!isDragging.current) return;
            const dx = e.clientX - dragStartX.current;
            dragStartX.current = e.clientX;
            dragOffset.current = THREE.MathUtils.clamp(
              dragOffset.current - dx * 0.0085,
              -(SLIDES.length - 1),
              SLIDES.length - 1
            );
            const base = scrollYProgress.get() * (SLIDES.length - 1);
            targetProgress.current = THREE.MathUtils.clamp(
              base + dragOffset.current,
              0,
              SLIDES.length - 1
            );
          }}
          onPointerUp={() => {
            isDragging.current = false;
          }}
          onPointerLeave={() => {
            isDragging.current = false;
          }}
        >
          <GalleryErrorBoundary fallback={<StaticGalleryFallback />}>
            <Suspense fallback={<StaticGalleryFallback />}>
              <Canvas
                dpr={[1, 2]}
                style={{ width: '100%', height: '100%', display: 'block' }}
                camera={{ position: [0, 0, 5.4], fov: 44 }}
                gl={{ antialias: true, alpha: true }}
                aria-label="3D swirling ribbon gallery of PocketPal app screens and v1.4.17 features"
              >
                <SwirlRibbonScene
                  targetProgress={targetProgress}
                  onActiveChange={setActiveIndex}
                  onSelectSlide={jumpToSlide}
                />
              </Canvas>
            </Suspense>
          </GalleryErrorBoundary>
        </div>

        {/* Bottom Editorial HUD */}
        <div className="relative z-10 mx-auto flex w-full max-w-6xl flex-col items-center justify-between gap-4 border-t border-[#253229] px-4 pt-4 sm:flex-row sm:px-8">
          <div className="text-center sm:text-left">
            <p className="font-mono text-[11px] tracking-[0.12em] text-[#96a59c] uppercase">
              [SCROLL, DRAG OR HOVER SHEET TO INSPECT]
            </p>
            <p className="mt-0.5 text-sm font-semibold text-[#eef3ee]">
              {activeSlide.label}{' '}
              <span className="hidden font-normal text-[#96a59c] md:inline">
                — {activeSlide.subtitle}
              </span>
            </p>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-mono text-xs font-semibold text-[#eef3ee] tabular-nums">
              {String(activeIndex + 1).padStart(2, '0')}/
              {String(SLIDES.length).padStart(2, '0')}
            </span>
            <div className="flex items-center gap-1.5" role="tablist" aria-label="Gallery slides">
              {SLIDES.map((s, idx) => (
                <button
                  key={s.id}
                  type="button"
                  role="tab"
                  aria-selected={idx === activeIndex}
                  aria-label={`Jump to ${s.label}`}
                  onClick={() => jumpToSlide(idx)}
                  className={`h-3.5 w-1.5 rounded-xs transition-all ${
                    idx === activeIndex
                      ? 'h-5 bg-mint'
                      : idx < activeIndex
                        ? 'bg-[#eef3ee]/60 hover:bg-[#eef3ee]'
                        : 'bg-[#253229] hover:bg-[#3e5245]'
                  }`}
                />
              ))}
            </div>
          </div>

          <a
            href={LINKS.releasePage}
            target="_blank"
            rel="noopener noreferrer"
            className="font-mono text-[11px] tracking-[0.12em] text-mint uppercase hover:text-white"
          >
            [VIEW {LINKS.version} RELEASE]
          </a>
        </div>
      </div>
    </section>
  );
}
