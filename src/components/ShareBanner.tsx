import React, {useState} from 'react';
import {CheckCircle2, Mail, MessageCircle, Share2, X} from 'lucide-react';

export interface ShareFeedback {
  id: number;
  message: string;
  shareText?: string;
}

interface ShareBannerProps {
  feedback: ShareFeedback | null;
  onDismiss: () => void;
}

export const ShareBanner: React.FC<ShareBannerProps> = ({feedback, onDismiss}) => {
  const [showFallbackLinks, setShowFallbackLinks] = useState(false);

  if (!feedback) return null;

  const shareTitle = 'Spark Office — Free Private Business Tools';
  const shareBody =
    feedback.shareText ||
    'I just used Spark Office — fast, 100% private client-side tools that work offline in the browser.';
  const shareUrl = typeof window !== 'undefined' ? window.location.href : '';

  const handleWebShare = async () => {
    if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
      try {
        await navigator.share({
          title: shareTitle,
          text: shareBody,
          url: shareUrl,
        });
        return;
      } catch (err) {
        if ((err as Error)?.name === 'AbortError') return;
      }
    }
    setShowFallbackLinks((prev) => !prev);
  };

  const whatsappHref = `https://wa.me/?text=${encodeURIComponent(`${shareBody} ${shareUrl}`)}`;
  const mailtoHref = `mailto:?subject=${encodeURIComponent(shareTitle)}&body=${encodeURIComponent(
    `${shareBody}\n\n${shareUrl}`
  )}`;

  return (
    <div
      role="status"
      aria-live="polite"
      className="no-print mt-6 rounded-xl border border-emerald-200 bg-emerald-50/70 p-4 dark:border-emerald-900/60 dark:bg-emerald-950/30"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-3">
          <CheckCircle2 className="mt-0.5 h-5 w-5 shrink-0 text-emerald-700 dark:text-emerald-400" aria-hidden="true" />
          <div>
            <p className="text-base font-semibold text-[#0F172A] dark:text-[#F8FAFC]">{feedback.message}</p>
            <p className="mt-0.5 text-sm text-slate-700 dark:text-slate-300">
              Need to merge or password-protect PDFs?{' '}
              <a
                href="#"
                className="font-semibold text-[#0284C7] underline decoration-[#0284C7]/40 underline-offset-2 hover:text-[#0369A1] dark:text-sky-400"
              >
                Try Spark PDF
              </a>
            </p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2 shrink-0">
          <button
            type="button"
            onClick={handleWebShare}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-base font-medium text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
          >
            <Share2 className="h-4 w-4 text-[#0284C7] dark:text-sky-400" aria-hidden="true" />
            <span>Share via WhatsApp / Email</span>
          </button>

          <button
            type="button"
            onClick={onDismiss}
            aria-label="Dismiss notification"
            className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg text-slate-500 transition hover:bg-emerald-100 hover:text-[#0F172A] dark:text-slate-400 dark:hover:bg-emerald-900/40 dark:hover:text-white"
          >
            <X className="h-4 w-4" aria-hidden="true" />
          </button>
        </div>
      </div>

      {showFallbackLinks && (
        <div className="mt-3 flex flex-wrap items-center gap-3 border-t border-emerald-200/80 pt-3 dark:border-emerald-900/50">
          <a
            href={whatsappHref}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-emerald-700 px-4 py-2 text-sm font-semibold text-white transition hover:bg-emerald-800"
          >
            <MessageCircle className="h-4 w-4" aria-hidden="true" />
            WhatsApp
          </a>
          <a
            href={mailtoHref}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0284C7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0369A1]"
          >
            <Mail className="h-4 w-4" aria-hidden="true" />
            Email
          </a>
        </div>
      )}
    </div>
  );
};
