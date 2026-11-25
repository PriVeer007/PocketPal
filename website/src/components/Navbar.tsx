import { useState, useEffect } from 'react';
import { Download, Menu, X } from 'lucide-react';
import { LINKS, NAV_ITEMS } from '../data/content';

export function Navbar() {
  const [menuOpen, setMenuOpen] = useState(false);

  useEffect(() => {
    if (!menuOpen) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setMenuOpen(false);
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [menuOpen]);

  return (
    <header className="sticky top-0 z-40 border-b border-border-subtle/90 bg-paper/92 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between gap-4 px-4 sm:px-6 lg:px-8">
        <a
          href="#top"
          className="flex items-center gap-2.5 text-ink no-underline transition-opacity hover:opacity-85"
        >
          <img
            src="./images/pocketpal-icon.png"
            alt=""
            width={32}
            height={32}
            className="h-8 w-8 rounded-lg border border-border-subtle object-cover"
          />
          <span className="text-base font-bold tracking-tight text-ink">
            PocketPal
          </span>
        </a>

        {/* Desktop navigation */}
        <nav aria-label="Primary" className="hidden items-center gap-1 lg:flex">
          {NAV_ITEMS.map((item) => (
            <a
              key={item.href}
              href={item.href}
              className="whitespace-nowrap rounded-lg px-3 py-1.5 text-sm font-medium text-ink-muted transition-colors hover:bg-paper-elevated hover:text-ink"
            >
              {item.label}
            </a>
          ))}
        </nav>

        <div className="flex shrink-0 items-center gap-2.5">
          <a
            href={LINKS.apkDownload}
            className="inline-flex shrink-0 items-center gap-2 whitespace-nowrap rounded-lg bg-forest px-3.5 py-2 text-sm font-semibold text-white transition-colors hover:bg-[#143b31]"
          >
            <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Download APK</span>
            <span className="hidden text-xs font-normal text-mint-soft/90 sm:inline">
              {LINKS.version}
            </span>
          </a>

          <button
            type="button"
            className="inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-lg border border-border-subtle bg-surface text-ink transition-colors hover:bg-paper-elevated lg:hidden"
            aria-expanded={menuOpen}
            aria-controls="mobile-nav-menu"
            aria-label={menuOpen ? 'Close navigation menu' : 'Open navigation menu'}
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? (
              <X className="h-4 w-4" aria-hidden="true" />
            ) : (
              <Menu className="h-4 w-4" aria-hidden="true" />
            )}
          </button>
        </div>
      </div>

      {/* Mobile & tablet navigation drawer */}
      {menuOpen && (
        <nav
          id="mobile-nav-menu"
          aria-label="Mobile navigation"
          className="border-t border-border-subtle bg-surface px-4 py-3 lg:hidden"
        >
          <ul className="flex flex-col gap-1">
            {NAV_ITEMS.map((item) => (
              <li key={item.href}>
                <a
                  href={item.href}
                  onClick={() => setMenuOpen(false)}
                  className="block rounded-lg px-3 py-2 text-sm font-medium text-ink hover:bg-paper-elevated"
                >
                  {item.label}
                </a>
              </li>
            ))}
            <li className="mt-1 border-t border-border-subtle pt-2">
              <a
                href={LINKS.repo}
                target="_blank"
                rel="noopener noreferrer"
                onClick={() => setMenuOpen(false)}
                className="block rounded-lg px-3 py-2 text-sm font-medium text-ink-muted hover:bg-paper-elevated hover:text-ink"
              >
                GitHub Repository
              </a>
            </li>
          </ul>
        </nav>
      )}
    </header>
  );
}
