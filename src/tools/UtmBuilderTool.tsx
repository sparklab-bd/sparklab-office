import React, {useEffect, useMemo, useState} from 'react';
import {Check, Clock, Copy, ExternalLink, Plus, RotateCcw, Sparkles, Trash2} from 'lucide-react';
import {safeStorageGet, safeStorageSet} from '../utils/security';

interface UtmDraft {
  baseUrl: string;
  source: string;
  medium: string;
  campaign: string;
  term: string;
  content: string;
}

interface UtmHistoryItem extends UtmDraft {
  id: string;
  finalUrl: string;
  createdAt: string;
}

const DRAFT_KEY = 'spark_office_utm_draft_v1';
const HISTORY_KEY = 'spark_office_utm_history_v1';

const EMPTY_DRAFT: UtmDraft = {
  baseUrl: '',
  source: '',
  medium: '',
  campaign: '',
  term: '',
  content: '',
};

const SAMPLE_DRAFT: UtmDraft = {
  baseUrl: 'https://sparkoffice.example/pricing',
  source: 'linkedin',
  medium: 'paid_social',
  campaign: 'q4_b2b_launch',
  term: 'privacy_suite',
  content: 'carousel_v2',
};

const PRESETS = [
  {label: 'Google Ads', source: 'google', medium: 'cpc'},
  {label: 'LinkedIn', source: 'linkedin', medium: 'social'},
  {label: 'Newsletter', source: 'newsletter', medium: 'email'},
  {label: 'QR Flyer', source: 'print_flyer', medium: 'qr_code'},
];

interface UtmBuilderToolProps {
  onActionSuccess: (message: string, shareText?: string) => void;
}

export const UtmBuilderTool: React.FC<UtmBuilderToolProps> = ({onActionSuccess}) => {
  const [draft, setDraft] = useState<UtmDraft>(() => safeStorageGet<UtmDraft>(DRAFT_KEY, SAMPLE_DRAFT));
  const [history, setHistory] = useState<UtmHistoryItem[]>(() =>
    safeStorageGet<UtmHistoryItem[]>(HISTORY_KEY, [])
  );
  const [copied, setCopied] = useState(false);

  useEffect(() => {
    safeStorageSet(DRAFT_KEY, draft);
  }, [draft]);

  useEffect(() => {
    safeStorageSet(HISTORY_KEY, history);
  }, [history]);

  const urlBuild = useMemo(() => {
    const raw = draft.baseUrl.trim();
    if (!raw) {
      return {valid: false, finalUrl: '', error: ''};
    }

    try {
      const normalized = /^[a-zA-Z][a-zA-Z\d+\-.]*:/.test(raw) ? raw : `https://${raw}`;
      const parsed = new URL(normalized);
      if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
        return {valid: false, finalUrl: '', error: 'Only http:// or https:// website URLs are supported.'};
      }

      if (draft.source.trim()) parsed.searchParams.set('utm_source', draft.source.trim());
      if (draft.medium.trim()) parsed.searchParams.set('utm_medium', draft.medium.trim());
      if (draft.campaign.trim()) parsed.searchParams.set('utm_campaign', draft.campaign.trim());
      if (draft.term.trim()) parsed.searchParams.set('utm_term', draft.term.trim());
      if (draft.content.trim()) parsed.searchParams.set('utm_content', draft.content.trim());

      return {valid: true, finalUrl: parsed.toString(), error: ''};
    } catch {
      return {valid: false, finalUrl: '', error: 'Enter a valid destination URL (e.g. https://yoursite.com/offer).'};
    }
  }, [draft]);

  const updateField = <K extends keyof UtmDraft>(key: K, value: UtmDraft[K]) => {
    setDraft((prev) => ({...prev, [key]: value}));
  };

  const saveToHistory = (finalUrl: string) => {
    setHistory((prev) => {
      if (prev[0]?.finalUrl === finalUrl) return prev;
      const entry: UtmHistoryItem = {
        ...draft,
        id: `${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
        finalUrl,
        createdAt: new Date().toLocaleString([], {
          month: 'short',
          day: 'numeric',
          hour: '2-digit',
          minute: '2-digit',
        }),
      };
      return [entry, ...prev.filter((item) => item.finalUrl !== finalUrl)].slice(0, 25);
    });
  };

  const handleCopyUrl = async () => {
    if (!urlBuild.valid || !urlBuild.finalUrl) return;
    await navigator.clipboard.writeText(urlBuild.finalUrl);
    saveToHistory(urlBuild.finalUrl);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
    onActionSuccess(
      'Trackable UTM campaign URL copied & saved to local history.',
      'I built a clean UTM campaign tracking link with Spark Office.'
    );
  };

  const handleSaveOnly = () => {
    if (!urlBuild.valid || !urlBuild.finalUrl) return;
    saveToHistory(urlBuild.finalUrl);
    onActionSuccess('UTM link saved to your browser history.');
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            UTM Campaign Link Builder
          </h2>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
            Generate clean, properly encoded marketing URLs with automatic local history.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setDraft(SAMPLE_DRAFT)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-base font-medium text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
          >
            <Sparkles className="h-4 w-4 text-[#0284C7] dark:text-sky-400" aria-hidden="true" />
            Try Sample
          </button>
          <button
            type="button"
            onClick={() => setDraft(EMPTY_DRAFT)}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-base font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      {/* Quick Presets */}
      <div className="flex flex-wrap items-center gap-2">
        <span className="mr-1 text-sm font-semibold text-slate-600 dark:text-slate-300">Quick Presets:</span>
        {PRESETS.map((preset) => (
          <button
            key={preset.label}
            type="button"
            onClick={() =>
              setDraft((prev) => ({
                ...prev,
                source: preset.source,
                medium: preset.medium,
              }))
            }
            className="min-h-[40px] rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] px-3.5 py-1.5 text-sm font-medium text-[#0F172A] transition hover:border-[#0284C7] hover:text-[#0284C7] dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:border-sky-400 dark:hover:text-sky-300"
          >
            {preset.label}
          </button>
        ))}
      </div>

      {/* Form + Output */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        <div className="space-y-4 lg:col-span-7">
          <div>
            <label htmlFor="utm-url" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Destination Website URL <span className="text-red-600">*</span>
            </label>
            <input
              id="utm-url"
              type="url"
              value={draft.baseUrl}
              onChange={(e) => updateField('baseUrl', e.target.value)}
              placeholder="https://example.com/landing-page"
              className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
            />
            {urlBuild.error && (
              <p role="alert" className="mt-1.5 text-sm font-medium text-red-600 dark:text-red-400">
                {urlBuild.error}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="utm-source" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Campaign Source (utm_source)
              </label>
              <input
                id="utm-source"
                type="text"
                value={draft.source}
                onChange={(e) => updateField('source', e.target.value)}
                placeholder="google, linkedin, newsletter"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
            </div>

            <div>
              <label htmlFor="utm-medium" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Campaign Medium (utm_medium)
              </label>
              <input
                id="utm-medium"
                type="text"
                value={draft.medium}
                onChange={(e) => updateField('medium', e.target.value)}
                placeholder="cpc, email, paid_social"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
            </div>

            <div>
              <label htmlFor="utm-campaign" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Campaign Name (utm_campaign)
              </label>
              <input
                id="utm-campaign"
                type="text"
                value={draft.campaign}
                onChange={(e) => updateField('campaign', e.target.value)}
                placeholder="spring_sale_2026"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
            </div>

            <div>
              <label htmlFor="utm-term" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Campaign Term (utm_term)
              </label>
              <input
                id="utm-term"
                type="text"
                value={draft.term}
                onChange={(e) => updateField('term', e.target.value)}
                placeholder="keyword_or_audience"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="utm-content" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Campaign Content (utm_content)
              </label>
              <input
                id="utm-content"
                type="text"
                value={draft.content}
                onChange={(e) => updateField('content', e.target.value)}
                placeholder="banner_a, hero_cta"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
            </div>
          </div>
        </div>

        {/* Generated URL + Actions */}
        <div className="flex flex-col justify-between space-y-5 lg:col-span-5">
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-5 dark:border-slate-800 dark:bg-[#0B1120]">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">Generated Trackable URL</h3>
            <div className="mt-3 min-h-[96px] rounded-lg border border-[#E2E8F0] bg-white p-4 font-mono text-sm leading-relaxed break-all text-[#0F172A] dark:border-slate-700 dark:bg-[#131C31] dark:text-[#F8FAFC]">
              {urlBuild.valid ? (
                urlBuild.finalUrl
              ) : (
                <span className="text-slate-400">Enter a valid website URL to generate your campaign link...</span>
              )}
            </div>

            <div className="mt-4 flex flex-col gap-2.5 sm:flex-row">
              <button
                type="button"
                onClick={handleCopyUrl}
                disabled={!urlBuild.valid}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#0284C7] px-4 py-2.5 text-base font-semibold text-white transition hover:bg-[#0369A1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {copied ? (
                  <>
                    <Check className="h-4 w-4" aria-hidden="true" />
                    Copied &amp; Saved
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy Campaign URL
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleSaveOnly}
                disabled={!urlBuild.valid}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-base font-medium text-[#0F172A] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
              >
                <Plus className="h-4 w-4" aria-hidden="true" />
                Save
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Recent LocalStorage History */}
      <div className="border-t border-[#E2E8F0] pt-6 dark:border-slate-800">
        <div className="flex items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <Clock className="h-5 w-5 text-slate-500 dark:text-slate-400" aria-hidden="true" />
            <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">
              Recent Campaign Links ({history.length})
            </h3>
          </div>
          {history.length > 0 && (
            <button
              type="button"
              onClick={() => setHistory([])}
              className="min-h-[40px] rounded-lg px-3 py-1.5 text-sm font-medium text-red-600 transition hover:bg-red-50 dark:text-red-400 dark:hover:bg-red-950/40"
            >
              Clear History
            </button>
          )}
        </div>

        {history.length === 0 ? (
          <p className="mt-3 text-base text-slate-500 dark:text-slate-400">
            No saved links yet. Click &ldquo;Copy Campaign URL&rdquo; or &ldquo;Save&rdquo; to store links locally in
            your browser.
          </p>
        ) : (
          <ul className="mt-4 divide-y divide-[#E2E8F0] rounded-xl border border-[#E2E8F0] bg-white dark:divide-slate-800 dark:border-slate-800 dark:bg-[#0B1120]">
            {history.map((item) => (
              <li
                key={item.id}
                className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"
              >
                <div className="min-w-0 flex-1">
                  <div className="flex flex-wrap items-center gap-2 text-xs font-medium text-slate-500 dark:text-slate-400">
                    <span className="font-semibold text-[#0284C7] dark:text-sky-400">
                      {item.campaign || 'Unnamed Campaign'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span>
                      {item.source || '—'} / {item.medium || '—'}
                    </span>
                    <span aria-hidden="true">·</span>
                    <span className="tabular-nums">{item.createdAt}</span>
                  </div>
                  <p className="mt-1 truncate font-mono text-sm text-[#0F172A] dark:text-[#F8FAFC]">
                    {item.finalUrl}
                  </p>
                </div>

                <div className="flex items-center gap-2 shrink-0">
                  <button
                    type="button"
                    onClick={() =>
                      setDraft({
                        baseUrl: item.baseUrl,
                        source: item.source,
                        medium: item.medium,
                        campaign: item.campaign,
                        term: item.term,
                        content: item.content,
                      })
                    }
                    className="min-h-[40px] rounded-lg border border-[#E2E8F0] bg-white px-3 py-1.5 text-sm font-medium text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC]"
                  >
                    Load
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      await navigator.clipboard.writeText(item.finalUrl);
                      onActionSuccess('Saved UTM URL copied to clipboard.');
                    }}
                    aria-label="Copy saved UTM URL"
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-[#0284C7] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-sky-400"
                  >
                    <Copy className="h-4 w-4" aria-hidden="true" />
                  </button>
                  <a
                    href={item.finalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="Open UTM URL in new tab"
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-slate-600 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300"
                  >
                    <ExternalLink className="h-4 w-4" aria-hidden="true" />
                  </a>
                  <button
                    type="button"
                    onClick={() => setHistory((prev) => prev.filter((h) => h.id !== item.id))}
                    aria-label="Delete saved UTM URL"
                    className="inline-flex min-h-[40px] min-w-[40px] items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                </div>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
};
