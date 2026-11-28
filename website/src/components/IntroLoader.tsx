import { useEffect, useMemo, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { LINKS } from '../data/content';

const ROWS = 14;
const TOKENS = ['POCKETPAL', 'ALLOWANCE', 'POCKETPAL', 'PACING', 'POCKETPAL', 'SQLITE'];

export function IntroLoader({ onComplete }: { onComplete?: () => void }) {
  const prefersReduced = useReducedMotion();
  const [revealRatio, setRevealRatio] = useState(prefersReduced ? 1 : 0);
  const [percent, setPercent] = useState(prefersReduced ? 100 : 0);
  const [done, setDone] = useState(Boolean(prefersReduced));

  const gridRows = useMemo(() => {
    return Array.from({ length: ROWS }, (_, r) => {
      const offset = r % TOKENS.length;
      const line: string[] = [];
      for (let i = 0; i < 14; i++) {
        line.push(TOKENS[(i + offset) % TOKENS.length]);
      }
      return line;
    });
  }, []);

  useEffect(() => {
    if (prefersReduced) {
      onComplete?.();
      return;
    }

    const start = performance.now();
    const duration = 1150;
    let rafId = 0;

    const tick = (now: number) => {
      const t = Math.min(1, (now - start) / duration);
      setRevealRatio(t);
      setPercent(Math.round(t * 100));
      if (t < 1) {
        rafId = requestAnimationFrame(tick);
      } else {
        window.setTimeout(() => {
          setDone(true);
          onComplete?.();
        }, 160);
      }
    };

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [prefersReduced, onComplete]);

  return (
    <AnimatePresence>
      {!done && (
        <motion.div
          aria-hidden="true"
          initial={{ clipPath: 'inset(0% 0% 0% 0%)' }}
          exit={{
            clipPath: 'inset(0% 0% 100% 0%)',
            transition: { duration: 0.6, ease: [0.76, 0, 0.24, 1] },
          }}
          className="fixed inset-0 z-[100] flex flex-col justify-between overflow-hidden bg-paper px-4 py-5 text-ink sm:px-8 sm:py-6"
        >
          {/* Top HUD matching reference video */}
          <div className="relative z-10 flex items-center justify-between font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase">
            <span>/POCKETPAL</span>
            <span className="font-semibold text-ink">OFFLINE LEDGER</span>
            <span>{LINKS.version}</span>
          </div>

          {/* Full-screen repeating typographic matrix */}
          <div className="my-auto flex flex-col justify-center gap-2.5 overflow-hidden py-4 select-none sm:gap-3.5">
            {gridRows.map((tokens, rIdx) => {
              const rowProgress = Math.max(
                0,
                Math.min(1, (revealRatio - rIdx * 0.04) * 2.2)
              );
              const visibleCount = Math.floor(rowProgress * tokens.length);

              return (
                <div
                  key={rIdx}
                  className="flex items-center gap-4 whitespace-nowrap font-mono text-sm tracking-[0.14em] uppercase sm:gap-6 sm:text-base"
                >
                  {tokens.map((word, cIdx) => {
                    const isVisible = cIdx < visibleCount;
                    const isBrand = word === 'POCKETPAL';
                    return (
                      <span
                        key={cIdx}
                        className={`transition-opacity duration-100 ${
                          isVisible
                            ? isBrand
                              ? 'font-bold text-forest opacity-100'
                              : 'font-normal text-ink/75 opacity-100'
                            : 'opacity-10'
                        }`}
                      >
                        {word}
                      </span>
                    );
                  })}
                </div>
              );
            })}
          </div>

          {/* Bottom HUD matching reference video */}
          <div className="relative z-10 flex items-center justify-between font-mono text-[11px] tracking-[0.14em] text-ink-muted uppercase">
            <span>LOCAL SQLITE · ZERO CLOUD</span>
            <span className="font-semibold text-forest tabular-nums">{percent}%</span>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
