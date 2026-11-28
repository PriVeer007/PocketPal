import { useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import { ArrowLeftRight, CheckCircle2, Plus, RefreshCw } from 'lucide-react';
import { Reveal } from './MotionPrimitives';

type BudgetMode = 'monthly' | 'flexible';
type LogKind = 'expense' | 'income';

interface DemoEntry {
  id: number;
  kind: LogKind;
  title: string;
  amount: number;
}

export function ReleaseLab() {
  const prefersReduced = useReducedMotion();
  const [mode, setMode] = useState<BudgetMode>('monthly');
  const [logKind, setLogKind] = useState<LogKind>('expense');
  const [desc, setDesc] = useState('');
  const [amount, setAmount] = useState(140);
  const [entries, setEntries] = useState<DemoEntry[]>([
    { id: 1, kind: 'expense', title: 'South Indian lunch', amount: 210 },
    { id: 2, kind: 'income', title: 'Allowance top-up', amount: 1500 },
  ]);

  const baseBalance = 7450;
  const delta = entries.reduce(
    (acc, item) => (item.kind === 'income' ? acc + item.amount : acc - item.amount),
    0
  );
  const currentBalance = baseBalance + delta;

  const handleLog = (e: React.FormEvent) => {
    e.preventDefault();
    const fallbackTitle =
      logKind === 'expense' ? 'Unspecified Expense' : 'Unspecified Income';
    const cleanTitle = desc.trim() || fallbackTitle;
    setEntries((prev) => [
      { id: Date.now(), kind: logKind, title: cleanTitle, amount },
      ...prev.slice(0, 3),
    ]);
    setDesc('');
  };

  return (
    <section
      id="whats-new"
      aria-labelledby="whats-new-heading"
      className="border-b border-border-subtle bg-surface py-16 sm:py-24"
    >
      <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
        <Reveal>
          <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
            <div className="max-w-2xl">
              <p className="text-xs font-bold tracking-[0.14em] text-forest uppercase">
                What’s New in v1.4.17
              </p>
              <h2
                id="whats-new-heading"
                className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl"
              >
                Try the latest release improvements
              </h2>
              <p className="mt-3 text-base text-ink-muted">
                Test how v1.4.17 handles reversible budgeting modes, optional
                descriptions, income top-ups, and synchronized balances.
              </p>
            </div>
            <span className="inline-flex shrink-0 items-center gap-1.5 rounded-md border border-border-subtle bg-paper px-3 py-1.5 font-mono text-xs text-forest">
              Interactive Release Preview
            </span>
          </div>
        </Reveal>

        <div className="mt-10 grid gap-6 lg:grid-cols-12">
          {/* Card 1: Budgeting Modes */}
          <Reveal delay={0.04} className="rounded-2xl border border-border-subtle bg-paper p-6 lg:col-span-5">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-forest">
                01 · BUDGETING MODES
              </span>
              <ArrowLeftRight className="h-4 w-4 text-forest" aria-hidden="true" />
            </div>
            <h3 className="mt-2.5 text-lg font-semibold text-ink">
              Monthly Cycle or No Fixed Cycle
            </h3>
            <p className="mt-1.5 text-sm text-ink-muted">
              Switch modes anytime without losing your balance or transaction
              history.
            </p>

            <div
              role="group"
              aria-label="Budgeting mode"
              className="mt-5 grid grid-cols-2 gap-2 rounded-xl border border-border-subtle bg-surface p-1.5"
            >
              <button
                type="button"
                onClick={() => setMode('monthly')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  mode === 'monthly'
                    ? 'bg-forest text-white'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                Monthly Cycle
              </button>
              <button
                type="button"
                onClick={() => setMode('flexible')}
                className={`rounded-lg px-3 py-2 text-xs font-semibold transition-colors ${
                  mode === 'flexible'
                    ? 'bg-forest text-white'
                    : 'text-ink-muted hover:text-ink'
                }`}
              >
                No Fixed Cycle
              </button>
            </div>

            <AnimatePresence mode="wait">
              <motion.div
                key={mode}
                initial={prefersReduced ? false : { opacity: 0, y: 6 }}
                animate={{ opacity: 1, y: 0 }}
                exit={prefersReduced ? undefined : { opacity: 0, y: -6 }}
                transition={{ duration: 0.18 }}
                className="mt-4 rounded-xl border border-border-subtle bg-surface p-4"
              >
                <div className="flex items-baseline justify-between">
                  <span className="text-xs font-medium text-ink-muted">
                    {mode === 'monthly' ? 'Resets on 1st' : 'Open-ended running ledger'}
                  </span>
                  <span className="inline-flex items-center gap-1 text-xs font-semibold text-forest">
                    <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" />
                    History preserved
                  </span>
                </div>
                <p className="mt-2 font-mono text-2xl font-bold text-ink tabular-nums">
                  ₹{currentBalance.toLocaleString('en-IN')}.00
                </p>
                <p className="mt-1 text-xs text-ink-muted">
                  {mode === 'monthly'
                    ? 'Tracks daily room against your cycle reset date.'
                    : 'Tracks net inflows and spending without a fixed reset.'}
                </p>
              </motion.div>
            </AnimatePresence>
          </Reveal>

          {/* Card 2: Optional Descriptions & Income Top-Ups + Sync */}
          <Reveal delay={0.1} className="rounded-2xl border border-border-subtle bg-paper p-6 lg:col-span-7">
            <div className="flex items-center justify-between gap-2">
              <span className="font-mono text-xs font-semibold text-forest">
                02 · OPTIONAL DESCRIPTIONS &amp; INCOME SYNC
              </span>
              <RefreshCw className="h-4 w-4 text-forest" aria-hidden="true" />
            </div>
            <h3 className="mt-2.5 text-lg font-semibold text-ink">
              Log in 2 taps—descriptions are now optional
            </h3>
            <p className="mt-1.5 text-sm text-ink-muted">
              Leave the note blank to log as{' '}
              <span className="font-medium text-ink">Unspecified Expense</span>{' '}
              or <span className="font-medium text-ink">Unspecified Income</span>.
              Every entry syncs across Dashboard, Activity, and Insights.
            </p>

            <form onSubmit={handleLog} className="mt-5 grid gap-3 sm:grid-cols-12">
              <div className="flex rounded-lg border border-border-subtle bg-surface p-1 sm:col-span-4">
                <button
                  type="button"
                  onClick={() => setLogKind('expense')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                    logKind === 'expense'
                      ? 'bg-forest text-white'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Expense
                </button>
                <button
                  type="button"
                  onClick={() => setLogKind('income')}
                  className={`flex-1 rounded-md py-1.5 text-xs font-semibold transition-colors ${
                    logKind === 'income'
                      ? 'bg-forest text-white'
                      : 'text-ink-muted hover:text-ink'
                  }`}
                >
                  Income
                </button>
              </div>

              <input
                type="text"
                value={desc}
                onChange={(e) => setDesc(e.target.value)}
                placeholder={
                  logKind === 'expense'
                    ? 'Optional (defaults to Unspecified Expense)'
                    : 'Optional (defaults to Unspecified Income)'
                }
                aria-label="Optional transaction description"
                className="rounded-lg border border-border-subtle bg-surface px-3 py-2 text-xs text-ink placeholder:text-ink-muted/70 sm:col-span-5"
              />

              <button
                type="submit"
                className="inline-flex items-center justify-center gap-1.5 rounded-lg bg-forest px-3.5 py-2 text-xs font-semibold text-white transition-colors hover:bg-[#143b31] sm:col-span-3"
              >
                <Plus className="h-3.5 w-3.5" aria-hidden="true" />
                <span>Log ₹{amount}</span>
              </button>
            </form>

            <div className="mt-3 flex flex-wrap items-center gap-2">
              <span className="text-xs text-ink-muted">Quick amount:</span>
              {[80, 140, 450, 1000].map((val) => (
                <button
                  key={val}
                  type="button"
                  onClick={() => setAmount(val)}
                  className={`rounded-md border px-2.5 py-1 font-mono text-xs transition-colors ${
                    amount === val
                      ? 'border-forest bg-mint-soft text-forest font-semibold'
                      : 'border-border-subtle bg-surface text-ink-muted hover:text-ink'
                  }`}
                >
                  ₹{val}
                </button>
              ))}
            </div>

            <div className="mt-4 space-y-2 border-t border-border-subtle pt-4">
              {entries.map((entry) => (
                <div
                  key={entry.id}
                  className="flex items-center justify-between rounded-lg border border-border-subtle bg-surface px-3.5 py-2 text-xs"
                >
                  <span className="font-medium text-ink">{entry.title}</span>
                  <span
                    className={`font-mono font-semibold tabular-nums ${
                      entry.kind === 'income' ? 'text-forest' : 'text-clay'
                    }`}
                  >
                    {entry.kind === 'income' ? '+' : '-'}₹{entry.amount}
                  </span>
                </div>
              ))}
            </div>
          </Reveal>
        </div>
      </div>
    </section>
  );
}
