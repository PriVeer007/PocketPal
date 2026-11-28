import { useState } from 'react';
import { Reveal } from './MotionPrimitives';

export function PacingCalculator() {
  const [allowance, setAllowance] = useState(9000);
  const [daysLeft, setDaysLeft] = useState(12);
  const [zeroSpendDays, setZeroSpendDays] = useState(2);

  const spent = Math.round(allowance * 0.25);
  const remaining = allowance - spent;
  const fixedDaily = Math.round(remaining / daysLeft);
  const effectiveDays = Math.max(daysLeft - zeroSpendDays, 1);
  const adaptiveDaily = Math.round(remaining / effectiveDays);
  const rolloverBoost = adaptiveDaily - fixedDaily;

  return (
    <section
      id="pacing-lab"
      aria-labelledby="pacing-heading"
      className="border-b border-border-subtle py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <div className="grid items-center gap-10 lg:grid-cols-12">
          <Reveal className="lg:col-span-5">
            <p className="text-xs font-bold tracking-[0.14em] text-forest uppercase">
              Interactive Pacing Lab
            </p>
            <h2
              id="pacing-heading"
              className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
            >
              See how Adaptive Room rewards zero-spend days
            </h2>
            <p className="mt-3 text-base leading-relaxed text-ink-muted">
              Fixed pacing keeps a flat daily limit. Adaptive pacing carries
              unspent room forward when you skip spending—giving you more
              breathing room later in the cycle.
            </p>
          </Reveal>

          <Reveal delay={0.08} className="rounded-2xl border border-border-subtle bg-surface p-6 shadow-sm sm:p-8 lg:col-span-7">
            <div className="grid gap-6 sm:grid-cols-3">
              <div>
                <div className="flex justify-between text-xs font-medium text-ink-muted">
                  <label htmlFor="calc-allowance">Allowance</label>
                  <span className="font-mono font-semibold text-ink tabular-nums">
                    ₹{allowance.toLocaleString('en-IN')}
                  </span>
                </div>
                <input
                  id="calc-allowance"
                  type="range"
                  min={3000}
                  max={25000}
                  step={500}
                  value={allowance}
                  onChange={(e) => setAllowance(Number(e.target.value))}
                  className="mt-2 w-full accent-forest"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-ink-muted">
                  <label htmlFor="calc-days">Days left</label>
                  <span className="font-mono font-semibold text-ink tabular-nums">
                    {daysLeft}d
                  </span>
                </div>
                <input
                  id="calc-days"
                  type="range"
                  min={4}
                  max={28}
                  step={1}
                  value={daysLeft}
                  onChange={(e) => {
                    const next = Number(e.target.value);
                    setDaysLeft(next);
                    if (zeroSpendDays >= next) setZeroSpendDays(Math.max(0, next - 1));
                  }}
                  className="mt-2 w-full accent-forest"
                />
              </div>

              <div>
                <div className="flex justify-between text-xs font-medium text-ink-muted">
                  <label htmlFor="calc-zero">Zero-spend days</label>
                  <span className="font-mono font-semibold text-ink tabular-nums">
                    {zeroSpendDays}d
                  </span>
                </div>
                <input
                  id="calc-zero"
                  type="range"
                  min={0}
                  max={Math.min(7, daysLeft - 1)}
                  step={1}
                  value={zeroSpendDays}
                  onChange={(e) => setZeroSpendDays(Number(e.target.value))}
                  className="mt-2 w-full accent-forest"
                />
              </div>
            </div>

            <div className="mt-7 grid gap-4 sm:grid-cols-2">
              <div className="rounded-xl border border-border-subtle bg-paper p-4">
                <p className="text-xs font-medium text-ink-muted">Fixed Daily Limit</p>
                <p className="mt-1 font-mono text-2xl font-bold text-ink tabular-nums">
                  ₹{fixedDaily.toLocaleString('en-IN')}
                  <span className="text-xs font-normal text-ink-muted"> / day</span>
                </p>
              </div>

              <div className="rounded-xl border border-forest/25 bg-mint-soft/60 p-4">
                <div className="flex items-center justify-between">
                  <p className="text-xs font-semibold text-forest">Adaptive Room</p>
                  {rolloverBoost > 0 && (
                    <span className="rounded-md bg-forest px-2 py-0.5 font-mono text-[11px] font-semibold text-white tabular-nums">
                      +₹{rolloverBoost}/d rollover
                    </span>
                  )}
                </div>
                <p className="mt-1 font-mono text-2xl font-bold text-forest tabular-nums">
                  ₹{adaptiveDaily.toLocaleString('en-IN')}
                  <span className="text-xs font-normal text-forest/80"> / day</span>
                </p>
              </div>
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
