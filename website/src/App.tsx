import { lazy, Suspense, useState } from 'react';
import { AnimatePresence, motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight,
  ChevronDown,
  Cpu,
  Download,
  ExternalLink,
  MessageSquare,
  ShieldCheck,
} from 'lucide-react';
import { CurvedGallery3D } from './components/CurvedGallery3D';
import { IntroLoader } from './components/IntroLoader';
import { Reveal, ScrollProgressBar } from './components/MotionPrimitives';
import { Navbar } from './components/Navbar';
import { PacingCalculator } from './components/PacingCalculator';
import { ReleaseLab } from './components/ReleaseLab';
import { SpotlightCard } from './components/SpotlightCard';
import {
  CHANGELOG,
  FAQS,
  GENUINE_REVIEWS,
  HIGHLIGHTS,
  INSTALL_STEPS,
  LINKS,
  TECH_STACK,
} from './data/content';

const Hero3DScene = lazy(() =>
  import('./components/Hero3DScene').then((m) => ({ default: m.Hero3DScene }))
);

function HeroFallbackCard() {
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

export default function App() {
  const prefersReduced = useReducedMotion();
  const [activeInstallStep, setActiveInstallStep] = useState(0);
  const [activeTechIdx, setActiveTechIdx] = useState(2);
  const [activeReleaseIdx, setActiveReleaseIdx] = useState(0);

  const heroInitial = prefersReduced ? false : { opacity: 0, y: 16 };
  const heroAnimate = { opacity: 1, y: 0 };

  return (
    <div id="top" className="min-h-screen bg-paper text-ink">
      <IntroLoader />
      <ScrollProgressBar />

      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-forest focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content">
        {/* 1. Kinetic 3D Hero Stage */}
        <section className="relative overflow-hidden border-b border-border-subtle bg-[linear-gradient(to_right,#dfe3dc38_1px,transparent_1px),linear-gradient(to_bottom,#dfe3dc38_1px,transparent_1px)] bg-[size:48px_48px] py-20 sm:py-24 lg:py-28">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
            <motion.div
              initial={heroInitial}
              animate={heroAnimate}
              transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0 lg:col-span-6"
            >
              <div className="inline-flex items-center gap-2 rounded-full border border-border-subtle bg-surface px-3.5 py-1.5 text-xs font-semibold tracking-wide text-forest shadow-xs">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden="true" />
                <span>Android {LINKS.version} · Flexible Cycles &amp; Offline SQLite</span>
              </div>

              <h1 className="mt-6 text-balance text-4xl font-bold tracking-[-0.03em] text-ink sm:text-5xl lg:text-[3.5rem] lg:leading-[1.05]">
                Track your student allowance,{' '}
                <span className="font-serif font-normal italic text-forest">
                  privately.
                </span>
              </h1>

              <p className="mt-6 max-w-[48ch] text-pretty text-base leading-[1.65] text-ink-muted sm:text-lg">
                Switch between Monthly Cycle and No Fixed Cycle budgeting, log
                spends in two taps, and build savings goals—stored 100% on your
                phone in local SQLite.
              </p>

              <div className="mt-9 flex flex-wrap items-center gap-3.5">
                <motion.a
                  href={LINKS.apkDownload}
                  whileHover={prefersReduced ? undefined : { scale: 1.02 }}
                  whileTap={prefersReduced ? undefined : { scale: 0.98 }}
                  className="inline-flex items-center gap-2.5 rounded-xl bg-forest px-6 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#143b31]"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Download {LINKS.apkName} ({LINKS.apkSize})</span>
                </motion.a>
                <a
                  href={LINKS.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-xl border border-border-subtle bg-surface px-5 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-elevated"
                >
                  <span>GitHub Source</span>
                  <ArrowUpRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                </a>
              </div>

              <dl className="mt-10 grid grid-cols-3 gap-4 border-t border-border-subtle pt-6">
                <div>
                  <dt className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
                    Storage
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">
                    Local SQLite
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
                    Accounts
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">
                    Zero Bank Links
                  </dd>
                </div>
                <div>
                  <dt className="text-[11px] font-semibold tracking-wider text-ink-muted uppercase">
                    Exports
                  </dt>
                  <dd className="mt-1 text-sm font-semibold text-ink">
                    CSV &amp; JSON
                  </dd>
                </div>
              </dl>
            </motion.div>

            {/* Interactive 3D Artifact */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, scale: 0.96 }}
              animate={{ opacity: 1, scale: 1 }}
              transition={{ duration: 0.55, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="min-w-0 lg:col-span-6"
            >
              <Suspense fallback={<HeroFallbackCard />}>
                <Hero3DScene />
              </Suspense>
            </motion.div>
          </div>
        </section>

        {/* 2. Interactive 3D-Tilt Spotlight Highlights */}
        <section className="border-b border-border-subtle bg-paper-elevated/45 py-14 sm:py-16">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {HIGHLIGHTS.map((item, idx) => (
                <Reveal key={item.number} delay={idx * 0.05} className="h-full">
                  <SpotlightCard className="rounded-2xl border border-border-subtle bg-surface p-6">
                    <span className="font-mono text-xs font-semibold text-forest">
                      {item.number}
                    </span>
                    <h2 className="mt-2.5 text-lg font-semibold tracking-tight text-ink">
                      {item.title}
                    </h2>
                    <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                      {item.description}
                    </p>
                  </SpotlightCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Interactive "What's New in v1.4.17" Release Lab */}
        <ReleaseLab />

        {/* 4. Interactive Adaptive vs Fixed Pacing Calculator */}
        <PacingCalculator />

        {/* 5. AnimatiCSS-Style Pinned 3D Swirl Scroll Gallery */}
        <CurvedGallery3D />

        {/* 6. Interactive Android APK Install Stepper + Architecture Inspector */}
        <section id="install" className="border-b border-border-subtle bg-surface py-16 sm:py-24">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-12 lg:grid-cols-12">
              <div className="lg:col-span-7">
                <Reveal>
                  <p className="text-xs font-bold tracking-[0.14em] text-forest uppercase">
                    Interactive Install Guide
                  </p>
                  <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink">
                    Install {LINKS.apkName} in 4 steps
                  </h2>
                </Reveal>

                <div className="mt-8 grid gap-4 sm:grid-cols-2">
                  {INSTALL_STEPS.map((item, idx) => {
                    const isActive = idx === activeInstallStep;
                    return (
                      <button
                        key={item.step}
                        type="button"
                        onClick={() => setActiveInstallStep(idx)}
                        className={`relative rounded-xl border p-5 text-left transition-all ${
                          isActive
                            ? 'border-forest bg-mint-soft/45 shadow-xs'
                            : 'border-border-subtle bg-paper hover:border-forest/40'
                        }`}
                      >
                        <div className="flex items-center justify-between">
                          <span className="font-mono text-xs font-semibold text-forest">
                            STEP {item.step}
                          </span>
                          {isActive && (
                            <span className="rounded-md bg-forest px-2 py-0.5 font-mono text-[10px] font-semibold text-white">
                              ACTIVE
                            </span>
                          )}
                        </div>
                        <h3 className="mt-2 text-base font-semibold text-ink">
                          {item.title}
                        </h3>
                        <p className="mt-1.5 text-xs leading-relaxed text-ink-muted">
                          {item.detail}
                        </p>
                      </button>
                    );
                  })}
                </div>
              </div>

              <div className="lg:col-span-5">
                <Reveal delay={0.08} className="rounded-2xl border border-border-subtle bg-paper p-6 sm:p-7">
                  <div className="flex items-center gap-2 text-forest">
                    <Cpu className="h-4 w-4" aria-hidden="true" />
                    <span className="font-mono text-xs font-bold uppercase">
                      Architecture Inspector
                    </span>
                  </div>
                  <h3 className="mt-2 text-xl font-bold text-ink">
                    Built for speed &amp; data integrity
                  </h3>

                  <div className="mt-5 divide-y divide-border-subtle text-sm">
                    {TECH_STACK.map((row, idx) => {
                      const selected = idx === activeTechIdx;
                      return (
                        <button
                          key={row.label}
                          type="button"
                          onClick={() => setActiveTechIdx(idx)}
                          className={`flex w-full items-center justify-between gap-4 rounded-lg px-2.5 py-3 text-left transition-colors ${
                            selected ? 'bg-mint-soft/60' : 'hover:bg-surface'
                          }`}
                        >
                          <span className="text-xs text-ink-muted">{row.label}</span>
                          <span className="text-right text-xs font-semibold text-ink">
                            {row.value}
                          </span>
                        </button>
                      );
                    })}
                  </div>

                  <div className="mt-5 flex items-start gap-2.5 rounded-lg border border-border-subtle bg-surface p-3 text-xs text-ink-muted">
                    <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-forest" aria-hidden="true" />
                    <span>
                      Insights are informational only—not financial advice.
                    </span>
                  </div>
                </Reveal>
              </div>
            </div>
          </div>
        </section>

        {/* 7. Interactive Release Changelog Switcher */}
        <section className="border-b border-border-subtle py-16 sm:py-20">
          <div className="mx-auto max-w-4xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-forest uppercase">
                    Release History
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    Compare Android releases
                  </h2>
                </div>

                <div
                  role="tablist"
                  aria-label="Release versions"
                  className="inline-flex rounded-xl border border-border-subtle bg-surface p-1"
                >
                  {CHANGELOG.map((rel, idx) => (
                    <button
                      key={rel.version}
                      type="button"
                      role="tab"
                      aria-selected={activeReleaseIdx === idx}
                      onClick={() => setActiveReleaseIdx(idx)}
                      className={`rounded-lg px-3.5 py-1.5 font-mono text-xs font-semibold transition-colors ${
                        activeReleaseIdx === idx
                          ? 'bg-forest text-white'
                          : 'text-ink-muted hover:text-ink'
                      }`}
                    >
                      {rel.version}
                    </button>
                  ))}
                </div>
              </div>
            </Reveal>

            <div className="mt-8">
              <AnimatePresence mode="wait">
                <motion.div
                  key={CHANGELOG[activeReleaseIdx].version}
                  initial={prefersReduced ? false : { opacity: 0, y: 8 }}
                  animate={{ opacity: 1, y: 0 }}
                  exit={prefersReduced ? undefined : { opacity: 0, y: -8 }}
                  transition={{ duration: 0.2 }}
                  className="rounded-2xl border border-border-subtle bg-surface p-6 sm:p-8"
                >
                  <div className="flex items-center justify-between">
                    <span className="rounded-md bg-mint-soft px-2.5 py-1 font-mono text-xs font-bold text-forest">
                      {CHANGELOG[activeReleaseIdx].version}
                    </span>
                    <span className="font-mono text-xs text-ink-muted">
                      {CHANGELOG[activeReleaseIdx].date}
                    </span>
                  </div>
                  <h3 className="mt-3 text-xl font-semibold text-ink">
                    {CHANGELOG[activeReleaseIdx].title}
                  </h3>
                  <ul className="mt-4 space-y-2.5 text-sm leading-relaxed text-ink-muted">
                    {CHANGELOG[activeReleaseIdx].notes.map((note) => (
                      <li key={note} className="flex items-start gap-2.5">
                        <span className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-forest" aria-hidden="true" />
                        <span>{note}</span>
                      </li>
                    ))}
                  </ul>
                </motion.div>
              </AnimatePresence>
            </div>
          </div>
        </section>

        {/* 8. Genuine Student Feedback (Spotlight Cards) */}
        <section id="reviews" className="border-b border-border-subtle bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="flex flex-col justify-between gap-4 sm:flex-row sm:items-end">
                <div>
                  <p className="text-xs font-bold tracking-[0.14em] text-forest uppercase">
                    Early Feedback
                  </p>
                  <h2 className="mt-2 text-2xl font-bold tracking-tight text-ink sm:text-3xl">
                    Notes from student testers
                  </h2>
                </div>
                <a
                  href={LINKS.feedbackForm}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex shrink-0 items-center gap-2 rounded-lg border border-border-subtle bg-paper px-3.5 py-2 text-sm font-semibold text-ink transition-colors hover:bg-paper-elevated"
                >
                  <MessageSquare className="h-4 w-4 text-forest" aria-hidden="true" />
                  <span>Send Feedback</span>
                </a>
              </div>
            </Reveal>

            <div className="mt-8 grid gap-6 md:grid-cols-3">
              {GENUINE_REVIEWS.map((review, idx) => (
                <Reveal key={review.id} delay={idx * 0.05} className="h-full">
                  <SpotlightCard className="flex flex-col justify-between rounded-xl border border-border-subtle bg-paper p-6">
                    <blockquote className="text-sm leading-relaxed text-ink">
                      “{review.quote}”
                    </blockquote>
                    <div className="mt-5 border-t border-border-subtle pt-3">
                      <p className="text-sm font-semibold text-ink">{review.author}</p>
                      <p className="text-xs text-ink-muted">{review.context}</p>
                    </div>
                  </SpotlightCard>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 9. Compact FAQ */}
        <section
          id="faq"
          aria-labelledby="faq-heading"
          className="border-b border-border-subtle py-16 sm:py-20"
        >
          <div className="mx-auto max-w-3xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <h2
                id="faq-heading"
                className="text-2xl font-bold tracking-tight text-ink sm:text-3xl"
              >
                Frequently asked questions
              </h2>
            </Reveal>

            <div className="faq-accordion mt-6 border-t border-border-subtle">
              {FAQS.map((item) => (
                <details key={item.question}>
                  <summary>
                    <span>{item.question}</span>
                    <ChevronDown className="faq-chevron" aria-hidden="true" />
                  </summary>
                  <div className="pb-5 pr-6 text-sm leading-relaxed text-ink-muted">
                    <p>{item.answer}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        </section>

        {/* 10. Direct APK Download CTA */}
        <section id="download" className="dark-surface bg-forest py-16 text-white sm:py-20">
          <div className="mx-auto flex max-w-5xl flex-col items-start justify-between gap-8 px-4 sm:px-6 lg:flex-row lg:items-center lg:px-8">
            <div className="max-w-xl">
              <p className="font-mono text-xs text-mint">
                {LINKS.version} · {LINKS.apkName} ({LINKS.apkSize})
              </p>
              <h2 className="mt-2 text-3xl font-bold tracking-tight text-white">
                Get PocketPal for Android
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-[#c9d7d0]">
                Direct APK release from GitHub. No sign-up, no bank access, and
                insights are strictly for personal awareness—not financial advice.
              </p>
            </div>

            <div className="flex flex-col items-start gap-3 sm:flex-row sm:items-center">
              <motion.a
                href={LINKS.apkDownload}
                whileHover={prefersReduced ? undefined : { scale: 1.03 }}
                whileTap={prefersReduced ? undefined : { scale: 0.98 }}
                className="inline-flex items-center gap-2.5 rounded-lg bg-mint px-6 py-3.5 text-sm font-bold text-[#0e1a15] transition-colors hover:bg-[#66c8a3]"
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Download {LINKS.apkName}</span>
              </motion.a>
              <a
                href={LINKS.releasePage}
                target="_blank"
                rel="noopener noreferrer"
                className="inline-flex items-center gap-1.5 rounded-lg border border-white/20 px-4 py-3.5 text-sm font-semibold text-white transition-colors hover:bg-white/10"
              >
                <span>Release Notes</span>
                <ExternalLink className="h-3.5 w-3.5" aria-hidden="true" />
              </a>
            </div>
          </div>
        </section>
      </main>

      {/* Minimal Footer */}
      <footer className="bg-forest-deep py-10 text-[#96a59c]">
        <div className="mx-auto flex max-w-6xl flex-col justify-between gap-6 px-4 sm:flex-row sm:items-center sm:px-6 lg:px-8">
          <div className="flex items-center gap-3">
            <img
              src="./images/pocketpal-icon.png"
              alt=""
              width={32}
              height={32}
              loading="lazy"
              className="h-8 w-8 rounded-lg border border-[#253229] object-cover"
            />
            <div>
              <p className="text-sm font-semibold text-[#eef3ee]">PocketPal</p>
              <p className="text-xs">
                Frontend by Raj Tivari · Backend by Prithvi Veeresh
              </p>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-5 text-xs">
            <a
              href={LINKS.repo}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#c8d4cd] hover:text-white"
            >
              GitHub
            </a>
            <a
              href={LINKS.releasePage}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#c8d4cd] hover:text-white"
            >
              Releases ({LINKS.version})
            </a>
            <a
              href={LINKS.feedbackForm}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#c8d4cd] hover:text-white"
            >
              Feedback Form
            </a>
          </div>
        </div>
      </footer>
    </div>
  );
}
