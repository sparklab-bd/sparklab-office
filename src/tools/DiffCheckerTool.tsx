import React, {useEffect, useMemo, useState} from 'react';
import {ArrowLeftRight, Check, Copy, FileUp, RotateCcw, Sparkles} from 'lucide-react';
import {safeStorageGet, safeStorageSet, validateFileSize} from '../utils/security';

interface DiffDraft {
  original: string;
  revised: string;
  ignoreCase: boolean;
  ignoreWhitespace: boolean;
}

type DiffOpType = 'equal' | 'delete' | 'insert';

interface DiffToken {
  type: DiffOpType;
  text: string;
}

const STORAGE_KEY = 'spark_office_diff_draft_v1';

const SAMPLE_ORIGINAL = `MASTER SERVICES AGREEMENT — SECTION 4: PAYMENT & CONFIDENTIALITY

4.1 Fees and Payment Terms. Client shall pay Provider the fixed fee of $12,500 within forty-five (45) calendar days of receiving an undisputed invoice. Late balances shall accrue interest at 1.0% per month.

4.2 Confidentiality. Both parties agree to keep all proprietary source code, pricing schedules, and customer records strictly confidential for a period of two (2) years following termination of this Agreement.

4.3 Governing Law. This Agreement shall be governed by the laws of the State of Delaware, without regard to conflict-of-law principles.`;

const SAMPLE_REVISED = `MASTER SERVICES AGREEMENT — SECTION 4: PAYMENT & CONFIDENTIALITY

4.1 Fees and Payment Terms. Client shall pay Provider the milestone fee of $14,000 within thirty (30) calendar days of receiving an itemized invoice. Late balances shall accrue interest at 1.5% per month or the maximum rate permitted by law.

4.2 Confidentiality. Both parties agree to keep all proprietary source code, security audits, pricing schedules, and customer records strictly confidential for a period of five (5) years following expiration or termination of this Agreement.

4.3 Governing Law & Venue. This Agreement shall be governed by the laws of the State of California, and any dispute shall be resolved exclusively in San Francisco County.`;

function tokenizeText(text: string): string[] {
  return text.match(/\S+|\s+/g) || [];
}

function normalizeToken(token: string, ignoreCase: boolean, ignoreWhitespace: boolean): string {
  let t = token;
  if (ignoreWhitespace && /^\s+$/.test(t)) return ' ';
  if (ignoreCase) t = t.toLowerCase();
  return t;
}

function computeWordDiff(
  original: string,
  revised: string,
  ignoreCase: boolean,
  ignoreWhitespace: boolean
): {tokens: DiffToken[]; addedWords: number; deletedWords: number; unchangedWords: number; truncated: boolean} {
  const aRaw = tokenizeText(original);
  const bRaw = tokenizeText(revised);

  const aNorm = aRaw.map((t) => normalizeToken(t, ignoreCase, ignoreWhitespace));
  const bNorm = bRaw.map((t) => normalizeToken(t, ignoreCase, ignoreWhitespace));

  // Trim common prefix and suffix for instant O(N) speed on large contracts
  let prefixLen = 0;
  while (prefixLen < aNorm.length && prefixLen < bNorm.length && aNorm[prefixLen] === bNorm[prefixLen]) {
    prefixLen++;
  }

  let suffixLen = 0;
  while (
    suffixLen < aNorm.length - prefixLen &&
    suffixLen < bNorm.length - prefixLen &&
    aNorm[aNorm.length - 1 - suffixLen] === bNorm[bNorm.length - 1 - suffixLen]
  ) {
    suffixLen++;
  }

  const aMid = aRaw.slice(prefixLen, aRaw.length - suffixLen);
  const bMid = bRaw.slice(prefixLen, bRaw.length - suffixLen);
  const aMidNorm = aNorm.slice(prefixLen, aNorm.length - suffixLen);
  const bMidNorm = bNorm.slice(prefixLen, bNorm.length - suffixLen);

  const midTokens: DiffToken[] = [];
  let truncated = false;

  // Guard against excessive DP memory on huge multi-megabyte diffs
  if (aMid.length * bMid.length > 1_200_000) {
    truncated = true;
    for (const t of aMid) midTokens.push({type: 'delete', text: t});
    for (const t of bMid) midTokens.push({type: 'insert', text: t});
  } else if (aMid.length > 0 || bMid.length > 0) {
    const m = aMid.length;
    const n = bMid.length;
    const dp = new Int32Array((m + 1) * (n + 1));
    const cols = n + 1;

    for (let i = 1; i <= m; i++) {
      for (let j = 1; j <= n; j++) {
        if (aMidNorm[i - 1] === bMidNorm[j - 1]) {
          dp[i * cols + j] = dp[(i - 1) * cols + (j - 1)] + 1;
        } else {
          const up = dp[(i - 1) * cols + j];
          const left = dp[i * cols + (j - 1)];
          dp[i * cols + j] = up >= left ? up : left;
        }
      }
    }

    const rev: DiffToken[] = [];
    let i = m;
    let j = n;
    while (i > 0 || j > 0) {
      if (i > 0 && j > 0 && aMidNorm[i - 1] === bMidNorm[j - 1]) {
        rev.push({type: 'equal', text: bMid[j - 1]});
        i--;
        j--;
      } else if (j > 0 && (i === 0 || dp[i * cols + (j - 1)] >= dp[(i - 1) * cols + j])) {
        rev.push({type: 'insert', text: bMid[j - 1]});
        j--;
      } else {
        rev.push({type: 'delete', text: aMid[i - 1]});
        i--;
      }
    }
    for (let k = rev.length - 1; k >= 0; k--) {
      midTokens.push(rev[k]);
    }
  }

  const allTokens: DiffToken[] = [
    ...aRaw.slice(0, prefixLen).map((t) => ({type: 'equal' as const, text: t})),
    ...midTokens,
    ...aRaw.slice(aRaw.length - suffixLen).map((t) => ({type: 'equal' as const, text: t})),
  ];

  let addedWords = 0;
  let deletedWords = 0;
  let unchangedWords = 0;

  for (const tok of allTokens) {
    if (!/\S/.test(tok.text)) continue;
    if (tok.type === 'insert') addedWords++;
    else if (tok.type === 'delete') deletedWords++;
    else unchangedWords++;
  }

  return {tokens: allTokens, addedWords, deletedWords, unchangedWords, truncated};
}

interface DiffCheckerToolProps {
  onActionSuccess: (message: string, shareText?: string) => void;
}

export const DiffCheckerTool: React.FC<DiffCheckerToolProps> = ({onActionSuccess}) => {
  const [draft, setDraft] = useState<DiffDraft>(() =>
    safeStorageGet<DiffDraft>(STORAGE_KEY, {
      original: SAMPLE_ORIGINAL,
      revised: SAMPLE_REVISED,
      ignoreCase: false,
      ignoreWhitespace: false,
    })
  );
  const [fileError, setFileError] = useState('');
  const [copiedSummary, setCopiedSummary] = useState(false);

  useEffect(() => {
    safeStorageSet(STORAGE_KEY, draft);
  }, [draft]);

  const diffResult = useMemo(
    () => computeWordDiff(draft.original, draft.revised, draft.ignoreCase, draft.ignoreWhitespace),
    [draft.original, draft.revised, draft.ignoreCase, draft.ignoreWhitespace]
  );

  const handleFileUpload = (target: 'original' | 'revised') => (e: React.ChangeEvent<HTMLInputElement>) => {
    setFileError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateFileSize(file);
    if (err) {
      setFileError(err);
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const content = typeof reader.result === 'string' ? reader.result : '';
      setDraft((prev) => ({...prev, [target]: content}));
    };
    reader.onerror = () => setFileError(`Could not read "${file.name}".`);
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopySummary = async () => {
    const lines = diffResult.tokens
      .map((t) => {
        if (t.type === 'delete') return `[-${t.text}-]`;
        if (t.type === 'insert') return `{+${t.text}+}`;
        return t.text;
      })
      .join('');

    await navigator.clipboard.writeText(lines);
    setCopiedSummary(true);
    setTimeout(() => setCopiedSummary(false), 2000);
    onActionSuccess(
      `Comparison summary copied (+${diffResult.addedWords} added, -${diffResult.deletedWords} deleted).`,
      'I just compared contract revisions privately in my browser with Spark Office.'
    );
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Contract &amp; Text Diff Checker
          </h2>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
            Compare drafts side by side. Deleted words highlight in soft red; added words highlight in soft green.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              setDraft((prev) => ({
                ...prev,
                original: SAMPLE_ORIGINAL,
                revised: SAMPLE_REVISED,
              }))
            }
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-base font-medium text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
          >
            <Sparkles className="h-4 w-4 text-[#0284C7] dark:text-sky-400" aria-hidden="true" />
            Try Sample
          </button>
          <button
            type="button"
            onClick={() =>
              setDraft((prev) => ({
                ...prev,
                original: prev.revised,
                revised: prev.original,
              }))
            }
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-base font-medium text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
          >
            <ArrowLeftRight className="h-4 w-4" aria-hidden="true" />
            Swap
          </button>
          <button
            type="button"
            onClick={() => setDraft({original: '', revised: '', ignoreCase: false, ignoreWhitespace: false})}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-base font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Clear
          </button>
        </div>
      </div>

      {/* Options & Diff Stats */}
      <div className="flex flex-col gap-3 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800 dark:bg-[#0B1120]">
        <div className="flex flex-wrap items-center gap-5">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 text-base font-medium text-[#0F172A] dark:text-[#F8FAFC]">
            <input
              type="checkbox"
              checked={draft.ignoreCase}
              onChange={(e) => setDraft((prev) => ({...prev, ignoreCase: e.target.checked}))}
              className="h-5 w-5 rounded border-slate-300 accent-[#0284C7]"
            />
            Ignore Case
          </label>
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2.5 text-base font-medium text-[#0F172A] dark:text-[#F8FAFC]">
            <input
              type="checkbox"
              checked={draft.ignoreWhitespace}
              onChange={(e) => setDraft((prev) => ({...prev, ignoreWhitespace: e.target.checked}))}
              className="h-5 w-5 rounded border-slate-300 accent-[#0284C7]"
            />
            Normalize Spaces
          </label>
        </div>

        <div className="flex flex-wrap items-center gap-4 text-sm font-semibold tabular-nums">
          <span className="text-red-700 dark:text-red-400">-{diffResult.deletedWords} deleted</span>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
            ·
          </span>
          <span className="text-emerald-700 dark:text-emerald-400">+{diffResult.addedWords} added</span>
          <span className="text-slate-300 dark:text-slate-700" aria-hidden="true">
            ·
          </span>
          <span className="text-slate-600 dark:text-slate-300">{diffResult.unchangedWords} unchanged</span>
        </div>
      </div>

      {fileError && (
        <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
          {fileError}
        </p>
      )}

      {/* Raw Input Editors */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-2">
        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="diff-original" className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Original Document
            </label>
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium text-[#0284C7] hover:bg-[#0284C7]/10 dark:text-sky-400">
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Load Text File
              <input
                type="file"
                accept=".txt,.md,.csv,.json,.log"
                onChange={handleFileUpload('original')}
                className="sr-only"
              />
            </label>
          </div>
          <textarea
            id="diff-original"
            rows={7}
            value={draft.original}
            onChange={(e) => setDraft((prev) => ({...prev, original: e.target.value}))}
            placeholder="Paste original contract or text here..."
            className="mt-1.5 w-full rounded-xl border border-[#E2E8F0] bg-white p-4 font-mono text-sm leading-relaxed text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
          />
        </div>

        <div>
          <div className="flex items-center justify-between">
            <label htmlFor="diff-revised" className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Revised Document
            </label>
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium text-[#0284C7] hover:bg-[#0284C7]/10 dark:text-sky-400">
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Load Text File
              <input
                type="file"
                accept=".txt,.md,.csv,.json,.log"
                onChange={handleFileUpload('revised')}
                className="sr-only"
              />
            </label>
          </div>
          <textarea
            id="diff-revised"
            rows={7}
            value={draft.revised}
            onChange={(e) => setDraft((prev) => ({...prev, revised: e.target.value}))}
            placeholder="Paste revised contract or text here..."
            className="mt-1.5 w-full rounded-xl border border-[#E2E8F0] bg-white p-4 font-mono text-sm leading-relaxed text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
          />
        </div>
      </div>

      {/* Side-by-Side Highlighted Comparison */}
      <div className="space-y-3">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h3 className="text-lg font-bold text-[#0F172A] dark:text-[#F8FAFC]">Side-by-Side Comparison</h3>
          <button
            type="button"
            onClick={handleCopySummary}
            disabled={!draft.original && !draft.revised}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0284C7] px-4 py-2 text-base font-semibold text-white transition hover:bg-[#0369A1] disabled:cursor-not-allowed disabled:opacity-50"
          >
            {copiedSummary ? (
              <>
                <Check className="h-4 w-4" aria-hidden="true" />
                Diff Summary Copied
              </>
            ) : (
              <>
                <Copy className="h-4 w-4" aria-hidden="true" />
                Copy Diff Markup
              </>
            )}
          </button>
        </div>

        {diffResult.truncated && (
          <p className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-2.5 text-sm text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200">
            Large section detected — displaying fast block comparison to keep your browser responsive.
          </p>
        )}

        <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
          {/* Left Pane: Original with Deleted Words in Soft Red */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 dark:border-slate-800 dark:bg-[#0B1120]">
            <div className="mb-3 flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300">
              <span>Original (Deletions Highlighted)</span>
              <span className="tabular-nums text-red-700 dark:text-red-400">-{diffResult.deletedWords} words</span>
            </div>
            <div className="min-h-[160px] whitespace-pre-wrap break-words text-base leading-relaxed text-[#0F172A] dark:text-[#F8FAFC]">
              {!draft.original && !draft.revised ? (
                <span className="text-slate-400">Enter text above or click &ldquo;Try Sample&rdquo; to inspect differences.</span>
              ) : (
                diffResult.tokens
                  .filter((tok) => tok.type !== 'insert')
                  .map((tok, idx) =>
                    tok.type === 'delete' ? (
                      <del
                        key={idx}
                        className="rounded-xs bg-red-100 px-0.5 text-red-900 line-through decoration-red-500/80 dark:bg-red-950/70 dark:text-red-200"
                      >
                        {tok.text}
                      </del>
                    ) : (
                      <span key={idx}>{tok.text}</span>
                    )
                  )
              )}
            </div>
          </div>

          {/* Right Pane: Revised with Added Words in Soft Green */}
          <div className="rounded-xl border border-[#E2E8F0] bg-white p-5 dark:border-slate-800 dark:bg-[#0B1120]">
            <div className="mb-3 flex items-center justify-between border-b border-[#E2E8F0] pb-2.5 text-sm font-semibold text-slate-700 dark:border-slate-800 dark:text-slate-300">
              <span>Revised (Additions Highlighted)</span>
              <span className="tabular-nums text-emerald-700 dark:text-emerald-400">+{diffResult.addedWords} words</span>
            </div>
            <div className="min-h-[160px] whitespace-pre-wrap break-words text-base leading-relaxed text-[#0F172A] dark:text-[#F8FAFC]">
              {!draft.original && !draft.revised ? (
                <span className="text-slate-400">Added clauses and words will appear highlighted in soft green.</span>
              ) : (
                diffResult.tokens
                  .filter((tok) => tok.type !== 'delete')
                  .map((tok, idx) =>
                    tok.type === 'insert' ? (
                      <ins
                        key={idx}
                        className="rounded-xs bg-emerald-100 px-0.5 text-emerald-950 no-underline dark:bg-emerald-950/70 dark:text-emerald-200"
                      >
                        {tok.text}
                      </ins>
                    ) : (
                      <span key={idx}>{tok.text}</span>
                    )
                  )
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
