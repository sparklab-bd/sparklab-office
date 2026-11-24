import React, {useEffect, useRef, useState} from 'react';
import {Download, ExternalLink, Moon, PlusSquare, Share, Sun, X} from 'lucide-react';
import {usePWAInstall} from '../hooks/usePWAInstall';

interface HeaderProps {
  resolvedDark: boolean;
  onToggleTheme: () => void;
}

const APPS_LINKS = [
  {name: 'Spark Office', href: '#'},
  {name: 'Spark PDF', href: '#'},
  {name: 'Spark Image', href: '#'},
  {name: 'Spark Studio', href: '#'},
];

export const Header: React.FC<HeaderProps> = ({resolvedDark, onToggleTheme}) => {
  const {isInstallable, isInstalled, isIOS, install} = usePWAInstall();
  const [appsOpen, setAppsOpen] = useState(false);
  const [showInstallGuide, setShowInstallGuide] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const appsButtonRef = useRef<HTMLButtonElement>(null);

  useEffect(() => {
    const handleOutsideClick = (e: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target as Node)) {
        setAppsOpen(false);
      }
    };
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        if (appsOpen) {
          setAppsOpen(false);
          appsButtonRef.current?.focus();
        }
        if (showInstallGuide) {
          setShowInstallGuide(false);
        }
      }
    };

    document.addEventListener('mousedown', handleOutsideClick);
    document.addEventListener('keydown', handleKeyDown);
    return () => {
      document.removeEventListener('mousedown', handleOutsideClick);
      document.removeEventListener('keydown', handleKeyDown);
    };
  }, [appsOpen, showInstallGuide]);

  const handleInstallClick = async () => {
    if (isInstallable) {
      const outcome = await install();
      if (outcome === 'unavailable') {
        setShowInstallGuide(true);
      }
      return;
    }
    setShowInstallGuide(true);
  };

  return (
    <>
      <header className="no-print sticky top-0 z-30 border-b border-[#E2E8F0] bg-white/95 backdrop-blur-sm dark:border-slate-800 dark:bg-[#0B1120]/95">
        <div className="mx-auto flex max-w-[1280px] items-center justify-between gap-4 px-4 py-3 sm:px-6 lg:px-8">
          {/* Header Left: Rounded-square Ocean Blue SO + Sparkle dot + Spark Office wordmark */}
          <a
            href="#"
            className="flex shrink-0 items-center gap-3 rounded-lg py-1 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-[#0284C7]"
            aria-label="Spark Office Home"
          >
            <span
              className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0284C7] text-white shadow-xs"
              aria-hidden="true"
            >
              <span className="text-[15px] font-extrabold tracking-tight leading-none">SO</span>
              <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-white" />
            </span>
            <span className="text-xl font-bold tracking-tight text-[#0F172A] whitespace-nowrap dark:text-[#F8FAFC]">
              Spark Office
            </span>
          </a>

          {/* Header Right: Apps pill dropdown + Install App button + Theme Toggle */}
          <div className="flex shrink-0 items-center gap-2.5 sm:gap-3">
            <div className="relative" ref={dropdownRef}>
              <button
                ref={appsButtonRef}
                type="button"
                onClick={() => setAppsOpen((prev) => !prev)}
                aria-expanded={appsOpen}
                aria-haspopup="menu"
                aria-controls="spark-apps-menu"
                className="inline-flex min-h-[44px] items-center gap-1.5 rounded-full border border-[#E2E8F0] bg-[#F8FAFC] px-4 py-2 text-base font-medium text-[#0F172A] whitespace-nowrap shrink-0 transition hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-800/80 dark:text-[#F8FAFC] dark:hover:bg-slate-800"
              >
                Apps ▾
              </button>

              {appsOpen && (
                <div
                  id="spark-apps-menu"
                  role="menu"
                  aria-label="Spark Suite Applications"
                  className="absolute right-0 mt-2 w-52 rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-lg dark:border-slate-700 dark:bg-[#131C31]"
                >
                  {APPS_LINKS.map((app, index) => (
                    <a
                      key={app.name}
                      href={app.href}
                      role="menuitem"
                      onClick={() => setAppsOpen(false)}
                      className={`flex min-h-[44px] items-center justify-between rounded-lg px-3.5 py-2 text-base font-medium transition ${
                        index === 0
                          ? 'bg-[#0284C7]/10 text-[#0284C7] dark:bg-[#0284C7]/20 dark:text-sky-300'
                          : 'text-[#0F172A] hover:bg-slate-50 dark:text-[#F8FAFC] dark:hover:bg-slate-800'
                      }`}
                    >
                      <span>{app.name}</span>
                      <ExternalLink className="h-4 w-4 opacity-50" aria-hidden="true" />
                    </a>
                  ))}
                </div>
              )}
            </div>

            {!isInstalled && (
              <button
                type="button"
                onClick={handleInstallClick}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0284C7] px-4 py-2 text-base font-semibold text-white whitespace-nowrap shrink-0 transition hover:bg-[#0369A1]"
              >
                <Download className="h-4 w-4 shrink-0" aria-hidden="true" />
                <span>Install App</span>
              </button>
            )}

            <button
              type="button"
              onClick={onToggleTheme}
              aria-label={resolvedDark ? 'Switch to light mode' : 'Switch to dark mode'}
              title={resolvedDark ? 'Switch to light mode' : 'Switch to dark mode'}
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
            >
              {resolvedDark ? (
                <Sun className="h-5 w-5" aria-hidden="true" />
              ) : (
                <Moon className="h-5 w-5" aria-hidden="true" />
              )}
            </button>
          </div>
        </div>
      </header>

      {/* iOS Safari / Manual Install Visual Guide Modal */}
      {showInstallGuide && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="install-guide-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setShowInstallGuide(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#131C31]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-3">
                <span
                  className="relative flex h-10 w-10 shrink-0 items-center justify-center rounded-xl bg-[#0284C7] text-white"
                  aria-hidden="true"
                >
                  <span className="text-[15px] font-extrabold tracking-tight">SO</span>
                  <span className="absolute top-1.5 right-1.5 h-1.5 w-1.5 rounded-full bg-white" />
                </span>
                <h2 id="install-guide-title" className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Install Spark Office
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setShowInstallGuide(false)}
                aria-label="Close install instructions"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 hover:text-[#0F172A] dark:text-slate-400 dark:hover:bg-slate-800 dark:hover:text-white"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-700 dark:bg-[#0B1120]">
              <p className="text-sm font-semibold text-slate-700 dark:text-slate-300">
                {isIOS ? 'iOS Safari (2-step install):' : 'iOS Safari & Desktop Browsers:'}
              </p>
              <div className="flex items-center gap-3 text-base text-[#0F172A] dark:text-[#F8FAFC]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0284C7]/10 text-[#0284C7] dark:bg-[#0284C7]/20 dark:text-sky-300">
                  <Share className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  1. Tap the <strong>Share</strong> icon in Safari&apos;s toolbar.
                </span>
              </div>
              <div className="flex items-center gap-3 text-base text-[#0F172A] dark:text-[#F8FAFC]">
                <span className="flex h-8 w-8 shrink-0 items-center justify-center rounded-lg bg-[#0284C7]/10 text-[#0284C7] dark:bg-[#0284C7]/20 dark:text-sky-300">
                  <PlusSquare className="h-4 w-4" aria-hidden="true" />
                </span>
                <span>
                  2. Scroll down and tap <strong>Add to Home Screen</strong>.
                </span>
              </div>
            </div>

            {!isIOS && (
              <p className="mt-3 text-sm text-slate-600 dark:text-slate-300">
                On Chrome or Edge desktop, you can also click the install icon in the address bar to run Spark Office
                offline as a standalone app.
              </p>
            )}

            <button
              type="button"
              onClick={() => setShowInstallGuide(false)}
              className="mt-5 min-h-[44px] w-full rounded-lg bg-[#0284C7] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#0369A1]"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
