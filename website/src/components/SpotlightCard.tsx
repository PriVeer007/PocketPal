import { useRef, useState, type ReactNode } from 'react';
import { motion, useMotionValue, useReducedMotion, useSpring, useTransform } from 'framer-motion';

interface SpotlightCardProps {
  children: ReactNode;
  className?: string;
}

export function SpotlightCard({ children, className = '' }: SpotlightCardProps) {
  const prefersReduced = useReducedMotion();
  const ref = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState({ x: 50, y: 50 });
  const [active, setActive] = useState(false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [4, -4]), {
    stiffness: 260,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-4, 4]), {
    stiffness: 260,
    damping: 24,
  });

  const handleMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReduced || e.pointerType === 'touch' || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    const px = ((e.clientX - rect.left) / rect.width) * 100;
    const py = ((e.clientY - rect.top) / rect.height) * 100;
    setPos({ x: px, y: py });
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  return (
    <div style={{ perspective: 900 }} className="h-full">
      <motion.div
        ref={ref}
        style={prefersReduced ? undefined : { rotateX, rotateY }}
        onPointerEnter={() => setActive(true)}
        onPointerMove={handleMove}
        onPointerLeave={() => {
          setActive(false);
          mouseX.set(0);
          mouseY.set(0);
        }}
        className={`relative h-full overflow-hidden transition-shadow duration-200 hover:shadow-[0_18px_40px_-18px_rgba(27,77,65,0.22)] ${className}`}
      >
        {!prefersReduced && (
          <div
            aria-hidden="true"
            style={{
              opacity: active ? 1 : 0,
              background: `radial-gradient(280px circle at ${pos.x}% ${pos.y}%, rgba(82, 183, 146, 0.14), transparent 70%)`,
            }}
            className="pointer-events-none absolute inset-0 transition-opacity duration-200"
          />
        )}
        <div className="relative z-10 h-full">{children}</div>
      </motion.div>
    </div>
  );
}
