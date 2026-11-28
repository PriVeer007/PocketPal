import { useRef, type ReactNode } from 'react';
import {
  motion,
  useMotionValue,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from 'framer-motion';

interface RevealProps {
  children: ReactNode;
  className?: string;
  delay?: number;
}

export function Reveal({ children, className = '', delay = 0 }: RevealProps) {
  const prefersReduced = useReducedMotion();

  if (prefersReduced) {
    return <div className={className}>{children}</div>;
  }

  return (
    <motion.div
      initial={{ opacity: 0, y: 18 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, amount: 'some' }}
      transition={{
        duration: 0.48,
        delay,
        ease: [0.22, 1, 0.36, 1],
      }}
      className={className}
    >
      {children}
    </motion.div>
  );
}

export function ScrollProgressBar() {
  const prefersReduced = useReducedMotion();
  const { scrollYProgress } = useScroll();
  const scaleX = useSpring(scrollYProgress, {
    stiffness: 240,
    damping: 32,
    restDelta: 0.001,
  });

  if (prefersReduced) return null;

  return (
    <motion.div
      aria-hidden="true"
      style={{ scaleX }}
      className="fixed top-0 right-0 left-0 z-50 h-[3px] origin-left bg-gradient-to-r from-forest via-mint to-ochre"
    />
  );
}

interface Tilt3DCardProps {
  children: ReactNode;
  className?: string;
  parallaxOffset?: number;
}

export function Tilt3DCard({
  children,
  className = '',
  parallaxOffset = 0,
}: Tilt3DCardProps) {
  const prefersReduced = useReducedMotion();
  const cardRef = useRef<HTMLDivElement>(null);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);

  const rotateX = useSpring(useTransform(mouseY, [-0.5, 0.5], [8, -8]), {
    stiffness: 220,
    damping: 24,
  });
  const rotateY = useSpring(useTransform(mouseX, [-0.5, 0.5], [-8, 8]), {
    stiffness: 220,
    damping: 24,
  });

  const { scrollYProgress } = useScroll({
    target: cardRef,
    offset: ['start end', 'end start'],
  });
  const scrollY = useTransform(
    scrollYProgress,
    [0, 1],
    prefersReduced ? [0, 0] : [parallaxOffset, -parallaxOffset]
  );

  const handlePointerMove = (e: React.PointerEvent<HTMLDivElement>) => {
    if (prefersReduced || e.pointerType === 'touch') return;
    const rect = e.currentTarget.getBoundingClientRect();
    const x = (e.clientX - rect.left) / rect.width - 0.5;
    const y = (e.clientY - rect.top) / rect.height - 0.5;
    mouseX.set(x);
    mouseY.set(y);
  };

  const handlePointerLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  return (
    <div ref={cardRef} style={{ perspective: 1100 }} className={className}>
      <motion.div
        style={
          prefersReduced
            ? undefined
            : {
                rotateX,
                rotateY,
                y: scrollY,
                transformStyle: 'preserve-3d',
              }
        }
        onPointerMove={handlePointerMove}
        onPointerLeave={handlePointerLeave}
        className="will-change-transform"
      >
        {children}
      </motion.div>
    </div>
  );
}
