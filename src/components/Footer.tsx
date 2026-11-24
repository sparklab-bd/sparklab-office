import React, {useEffect, useState} from 'react';
import {Check, Copy, Mail, ShieldCheck, X} from 'lucide-react';

export const Footer: React.FC = () => {
  const [legalOpen, setLegalOpen] = useState(false);
  const [issueOpen, setIssueOpen] = useState(false);
  const [copiedDiag, setCopiedDiag] = useState(false);

  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setLegalOpen(false);
        setIssueOpen(false);
      }
    };
    document.addEventListener('keydown', onKeyDown);
    return () => document.removeEventListener('keydown', onKeyDown);
  }, []);

  const diagnosticsText = `Spark Office Bug Report\nBrowser: ${
    typeof navigator !== 'undefined' ? navigator.userAgent : 'Unknown'
  }\nOnline: ${typeof navigator !== 'undefined' ? navigator.onLine : 'Unknown'}\nIssue description: `;

  const handleCopyDiag = async () => {
    try {
      await navigator.clipboard.writeText(diagnosticsText);
      setCopiedDiag(true);
      setTimeout(() => setCopiedDiag(false), 2000);
    } catch {
      // Ignore clipboard failures
    }
  };

  return (
    <>
      <footer className="no-print mt-12 border-t border-[#E2E8F0] bg-white py-6 dark:border-slate-800 dark:bg-[#0B1120]">
        <div className="mx-auto flex max-w-[1280px] flex-col items-center justify-between gap-4 px-4 text-center sm:flex-row sm:px-6 sm:text-left lg:px-8">
          <p className="text-sm text-slate-600 dark:text-slate-400">
            100% Private • Works Offline (Test in Airplane Mode) • Powered by Spark Lab
          </p>

          <div className="flex flex-wrap items-center justify-center gap-4 text-sm font-medium">
            <button
              type="button"
              onClick={() => setLegalOpen(true)}
              className="min-h-[44px] px-2 text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-[#0284C7] dark:text-slate-300 dark:decoration-slate-700 dark:hover:text-sky-400"
            >
              Privacy &amp; Terms
            </button>
            <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
              ·
            </span>
            <button
              type="button"
              onClick={() => setIssueOpen(true)}
              className="min-h-[44px] px-2 text-slate-700 underline decoration-slate-300 underline-offset-4 transition hover:text-[#0284C7] dark:text-slate-300 dark:decoration-slate-700 dark:hover:text-sky-400"
            >
              Report Issue
            </button>
          </div>
        </div>
      </footer>

      {/* Privacy & Terms Modal */}
      {legalOpen && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setLegalOpen(false);
          }}
        >
          <div className="max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#131C31]">
            <div className="flex items-start justify-between gap-4">
              <div className="flex items-center gap-2.5">
                <ShieldCheck className="h-6 w-6 text-[#0284C7] dark:text-sky-400" aria-hidden="true" />
                <h2 id="legal-modal-title" className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                  Privacy &amp; Terms
                </h2>
              </div>
              <button
                type="button"
                onClick={() => setLegalOpen(false)}
                aria-label="Close Privacy and Terms"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>

            <div className="mt-4 space-y-4 text-base text-slate-700 dark:text-slate-300">
              <div>
                <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Zero Data Collection</h3>
                <p className="mt-1">
                  Spark Office runs 100% locally inside your web browser. No server calls, analytics, tracking cookies,
                  or external data uploads occur. All drafts and history are stored strictly in your device&apos;s
                  LocalStorage and never leave your browser.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">AS-IS Software Disclaimer</h3>
                <p className="mt-1">
                  Spark Office is provided on an &ldquo;AS IS&rdquo; and &ldquo;AS AVAILABLE&rdquo; basis without
                  warranties of any kind, express or implied, including merchantability, fitness for a particular purpose,
                  or accuracy of generated contracts, calculations, or documents.
                </p>
              </div>
              <div>
                <h3 className="font-semibold text-[#0F172A] dark:text-[#F8FAFC]">$0 Liability Cap</h3>
                <p className="mt-1">
                  To the maximum extent permitted by applicable law, Spark Lab and its contributors shall not be liable
                  for any direct, indirect, incidental, or consequential damages, with total aggregate liability capped
                  strictly at $0 USD. Always verify generated quotations, diffs, and extracted data before business use.
                </p>
              </div>
            </div>

            <button
              type="button"
              onClick={() => setLegalOpen(false)}
              className="mt-6 min-h-[44px] w-full rounded-lg bg-[#0284C7] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#0369A1]"
            >
              Close
            </button>
          </div>
        </div>
      )}

      {/* Report Issue Modal */}
      {issueOpen && (
        <div
          className="no-print fixed inset-0 z-50 flex items-center justify-center bg-slate-950/60 p-4"
          role="dialog"
          aria-modal="true"
          aria-labelledby="issue-modal-title"
          onClick={(e) => {
            if (e.target === e.currentTarget) setIssueOpen(false);
          }}
        >
          <div className="w-full max-w-md rounded-2xl border border-[#E2E8F0] bg-white p-6 shadow-xl dark:border-slate-700 dark:bg-[#131C31]">
            <div className="flex items-start justify-between gap-4">
              <h2 id="issue-modal-title" className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Report an Issue
              </h2>
              <button
                type="button"
                onClick={() => setIssueOpen(false)}
                aria-label="Close Report Issue"
                className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 transition hover:bg-slate-100 dark:text-slate-400 dark:hover:bg-slate-800"
              >
                <X className="h-5 w-5" aria-hidden="true" />
              </button>
            </div>
            <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
              Because Spark Office blocks all background network requests, you can send feedback via your email client
              or copy your browser details below.
            </p>
            <div className="mt-4 flex flex-col gap-3">
              <a
                href={`mailto:support@sparklab.local?subject=${encodeURIComponent(
                  'Spark Office Issue Report'
                )}&body=${encodeURIComponent(diagnosticsText)}`}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg bg-[#0284C7] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#0369A1]"
              >
                <Mail className="h-4 w-4" aria-hidden="true" />
                Open Email Draft
              </a>
              <button
                type="button"
                onClick={handleCopyDiag}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-base font-medium text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
              >
                {copiedDiag ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    Copied Report Template
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy Diagnostics Template
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
