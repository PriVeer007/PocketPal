import { motion, useReducedMotion } from 'framer-motion';
import {
  ArrowUpRight,
  ChevronDown,
  Download,
  ExternalLink,
  MessageSquare,
} from 'lucide-react';
import { Reveal } from './components/MotionPrimitives';
import { Navbar } from './components/Navbar';
import {
  FAQS,
  GENUINE_REVIEWS,
  HIGHLIGHTS,
  LINKS,
} from './data/content';

export default function App() {
  const prefersReduced = useReducedMotion();

  const heroInitial = prefersReduced ? false : { opacity: 0, y: 14 };
  const heroAnimate = { opacity: 1, y: 0 };

  return (
    <div id="top" className="min-h-screen bg-paper text-ink">
      <a
        href="#main-content"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-forest focus:px-4 focus:py-2 focus:text-sm focus:font-semibold focus:text-white"
      >
        Skip to main content
      </a>

      <Navbar />

      <main id="main-content">
        {/* 1. Focused Hero */}
        <section className="border-b border-border-subtle py-14 sm:py-20 lg:py-24">
          <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-12 lg:gap-12 lg:px-8">
            <motion.div
              initial={heroInitial}
              animate={heroAnimate}
              transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6"
            >
              <div className="inline-flex items-center gap-2 rounded-md border border-border-subtle bg-surface px-3 py-1 text-xs font-semibold text-forest">
                <span className="h-1.5 w-1.5 rounded-full bg-mint" aria-hidden="true" />
                <span>Android APK · {LINKS.version}</span>
              </div>

              <h1 className="mt-5 text-4xl font-bold tracking-tight text-ink sm:text-5xl lg:leading-[1.08]">
                Track your student allowance,{' '}
                <span className="font-serif font-normal italic text-forest">
                  privately.
                </span>
              </h1>

              <p className="mt-5 max-w-lg text-base leading-relaxed text-ink-muted sm:text-lg">
                Set a monthly cycle, log daily spends in seconds, and build
                savings goals—stored 100% on your phone in local SQLite with
                zero bank logins or accounts.
              </p>

              <div className="mt-8 flex flex-wrap items-center gap-3.5">
                <a
                  href={LINKS.apkDownload}
                  className="inline-flex items-center gap-2.5 rounded-lg bg-forest px-5 py-3.5 text-sm font-semibold text-white shadow-sm transition-colors hover:bg-[#143b31]"
                >
                  <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                  <span>Download APK ({LINKS.apkSize})</span>
                </a>
                <a
                  href={LINKS.repo}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="inline-flex items-center gap-1.5 rounded-lg border border-border-subtle bg-surface px-4 py-3.5 text-sm font-semibold text-ink transition-colors hover:bg-paper-elevated"
                >
                  <span>GitHub Source</span>
                  <ArrowUpRight className="h-4 w-4 text-ink-muted" aria-hidden="true" />
                </a>
              </div>

              <p className="mt-6 font-mono text-xs text-ink-muted">
                {LINKS.apkName} · Offline SQLite · CSV &amp; JSON Backup
              </p>
            </motion.div>

            {/* Crisp, native-resolution Dark Mode screenshot */}
            <motion.div
              initial={prefersReduced ? false : { opacity: 0, y: 18 }}
              animate={heroAnimate}
              transition={{ duration: 0.5, delay: 0.08, ease: [0.22, 1, 0.36, 1] }}
              className="lg:col-span-6"
            >
              <div className="mx-auto max-w-[440px] rounded-2xl border-[6px] border-[#18201c] bg-[#131614] p-2 shadow-[0_24px_60px_-18px_rgba(17,22,19,0.28)]">
                <img
                  src="./images/screen-today-dark.jpg"
                  alt="PocketPal Today screen in Dark Mode showing ₹19,500.00 available this cycle, Base ₹20,000.00 plus Extra ₹5,000.00, with 7 days left."
                  width={1024}
                  height={907}
                  fetchPriority="high"
                  decoding="sync"
                  className="block h-auto w-full rounded-xl select-none"
                />
              </div>
            </motion.div>
          </div>
        </section>

        {/* 2. Four Clean Highlights */}
        <section id="highlights" className="border-b border-border-subtle bg-surface py-16 sm:py-20">
          <div className="mx-auto max-w-6xl px-4 sm:px-6 lg:px-8">
            <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
              {HIGHLIGHTS.map((item, idx) => (
                <Reveal key={item.number} delay={idx * 0.05}>
                  <span className="font-mono text-xs font-semibold text-forest">
                    {item.number}
                  </span>
                  <h2 className="mt-2.5 text-lg font-semibold tracking-tight text-ink">
                    {item.title}
                  </h2>
                  <p className="mt-2 text-sm leading-relaxed text-ink-muted">
                    {item.description}
                  </p>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 3. Crisp App Previews (Only high-res 460x1024 portrait screens, framed at 264px so they are 1.7x supersampled) */}
        <section id="previews" className="border-b border-border-subtle py-16 sm:py-24">
          <div className="mx-auto max-w-5xl px-4 sm:px-6 lg:px-8">
            <Reveal>
              <div className="mx-auto max-w-xl text-center">
                <p className="text-xs font-bold tracking-[0.14em] text-forest uppercase">
                  Inside PocketPal
                </p>
                <h2 className="mt-2 text-3xl font-bold tracking-tight text-ink sm:text-4xl">
                  Calm visibility, zero clutter
                </h2>
                <p className="mt-3 text-base text-ink-muted">
                  Notice mindful vs. impulse patterns and track savings targets
                  without spreadsheets or bank links.
                </p>
              </div>
            </Reveal>

            <div className="mt-12 grid items-start justify-items-center gap-10 sm:grid-cols-2">
              <Reveal delay={0.05} className="w-full max-w-[264px]">
                <div className="overflow-hidden rounded-[2rem] border-[6px] border-[#18201c] bg-[#18201c] shadow-[0_20px_50px_-16px_rgba(17,22,19,0.25)]">
                  <img
                    src="./images/screen-insights-behaviour.jpg"
                    alt="PocketPal Insights Behaviour tab showing Mindful 62% vs Impulse 38% and reflection counts."
                    width={460}
                    height={1024}
                    loading="lazy"
                    className="block h-auto w-full rounded-[1.55rem] select-none"
                  />
                </div>
                <p className="mt-3 text-center text-xs font-semibold text-ink-muted">
                  Insights · Spending Reflections
                </p>
              </Reveal>

              <Reveal delay={0.12} className="w-full max-w-[264px]">
                <div className="overflow-hidden rounded-[2rem] border-[6px] border-[#18201c] bg-[#18201c] shadow-[0_20px_50px_-16px_rgba(17,22,19,0.25)]">
                  <img
                    src="./images/screen-goals.jpg"
                    alt="PocketPal Savings Goals screen showing Wireless headphones at 53% and Emergency cushion at 40%."
                    width={460}
                    height={1024}
                    loading="lazy"
                    className="block h-auto w-full rounded-[1.55rem] select-none"
                  />
                </div>
                <p className="mt-3 text-center text-xs font-semibold text-ink-muted">
                  Goals · Savings Targets
                </p>
              </Reveal>
            </div>
          </div>
        </section>

        {/* 4. Genuine Student Feedback */}
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
                <Reveal
                  key={review.id}
                  delay={idx * 0.05}
                  className="flex flex-col justify-between rounded-xl border border-border-subtle bg-paper p-6"
                >
                  <blockquote className="text-sm leading-relaxed text-ink">
                    “{review.quote}”
                  </blockquote>
                  <div className="mt-5 border-t border-border-subtle pt-3">
                    <p className="text-sm font-semibold text-ink">{review.author}</p>
                    <p className="text-xs text-ink-muted">{review.context}</p>
                  </div>
                </Reveal>
              ))}
            </div>
          </div>
        </section>

        {/* 5. Compact FAQ */}
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

        {/* 6. Direct APK Download CTA */}
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
              <a
                href={LINKS.apkDownload}
                className="inline-flex items-center gap-2.5 rounded-lg bg-mint px-6 py-3.5 text-sm font-bold text-[#0e1a15] transition-colors hover:bg-[#66c8a3]"
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Download APK</span>
              </a>
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
