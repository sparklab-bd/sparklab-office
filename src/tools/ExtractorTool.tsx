import React, {useEffect, useMemo, useState} from 'react';
import {Check, Copy, Download, FileUp, RotateCcw, Sparkles} from 'lucide-react';
import {safeStorageGet, safeStorageSet, sanitizeCsvCell, validateFileSize} from '../utils/security';

type ExtractMode = 'both' | 'emails' | 'phones';

interface ExtractorDraft {
  rawText: string;
  mode: ExtractMode;
  sortAlpha: boolean;
  lowercaseEmails: boolean;
}

const STORAGE_KEY = 'spark_office_extractor_draft_v1';

const SAMPLE_MESSY_TEXT = `From: "Elena Vance" <Elena.Vance@ApexPartners.io>, <sales@apexpartners.io>
Subject: Q4 Vendor Follow-ups & Regional Contacts

Hi team — please reach out to the contacts below before Friday:
1) Marcus Chen (East Coast Ops): +1 (212) 555-0194 or m.chen@harborfreight.example
2) Duplicate test: ELENA.VANCE@APEXPARTNERS.IO / (212) 555-0194
3) Priya Nair — Bangalore Hub: +91 98450 11223 | priya.nair@cloudgrid.co.in
4) London Desk: +44 20 7946 0921 (ask for Oliver, oliver.grant@thamesworks.co.uk)
5) Billing Support: billing+2026@apexpartners.io | Toll-free 800-555-0148
Notes: Invoice #2026-10482 is NOT a phone number, and ref 12345 is an order ID.`;

const EMAIL_REGEX = /\b[A-Za-z0-9._%+-]+@[A-Za-z0-9.-]+\.[A-Za-z]{2,}\b/g;
// Matches realistic international/local phone numbers (7–15 digits, optional leading +, spaces/dots/dashes/parens)
const PHONE_CANDIDATE_REGEX = /(?:(?:\+|00)\d{1,3}[\s.-]?)?(?:\(\d{2,4}\)|\d{2,4})[\s.-]?\d{3,4}[\s.-]?\d{3,4}(?:[\s.-]?\d{1,4})?/g;

interface ExtractedRow {
  type: 'Email' | 'Phone';
  value: string;
}

interface ExtractorToolProps {
  onActionSuccess: (message: string, shareText?: string) => void;
}

export const ExtractorTool: React.FC<ExtractorToolProps> = ({onActionSuccess}) => {
  const [draft, setDraft] = useState<ExtractorDraft>(() =>
    safeStorageGet<ExtractorDraft>(STORAGE_KEY, {
      rawText: SAMPLE_MESSY_TEXT,
      mode: 'both',
      sortAlpha: true,
      lowercaseEmails: true,
    })
  );
  const [fileError, setFileError] = useState('');
  const [copiedAll, setCopiedAll] = useState(false);
  const [copiedIndex, setCopiedIndex] = useState<number | null>(null);

  useEffect(() => {
    safeStorageSet(STORAGE_KEY, draft);
  }, [draft]);

  const extraction = useMemo(() => {
    const rawEmails = draft.rawText.match(EMAIL_REGEX) || [];
    const emailMap = new Map<string, string>();
    for (const em of rawEmails) {
      const normalizedKey = em.toLowerCase();
      const displayVal = draft.lowercaseEmails ? normalizedKey : em;
      if (!emailMap.has(normalizedKey)) {
        emailMap.set(normalizedKey, displayVal);
      }
    }

    const rawPhoneMatches = draft.rawText.match(PHONE_CANDIDATE_REGEX) || [];
    const phoneMap = new Map<string, string>();
    let totalPhoneMatches = 0;

    for (const candidate of rawPhoneMatches) {
      const trimmed = candidate.trim();
      const digitsOnly = trimmed.replace(/\D/g, '');
      // Filter out short IDs, years, or overly long non-phone numbers
      if (digitsOnly.length < 7 || digitsOnly.length > 15) continue;
      // Skip obvious date-like patterns such as 2026-10-482 or 2026-11-24
      if (/^(19|20)\d{2}[-/.]\d{1,2}[-/.]\d{1,2}$/.test(trimmed)) continue;

      totalPhoneMatches++;
      const dedupeKey = digitsOnly;
      if (!phoneMap.has(dedupeKey)) {
        phoneMap.set(dedupeKey, trimmed);
      }
    }

    let emails = Array.from(emailMap.values());
    let phones = Array.from(phoneMap.values());

    if (draft.sortAlpha) {
      emails = [...emails].sort((a, b) => a.localeCompare(b));
      phones = [...phones].sort((a, b) => a.localeCompare(b));
    }

    const rows: ExtractedRow[] = [];
    if (draft.mode === 'both' || draft.mode === 'emails') {
      for (const email of emails) rows.push({type: 'Email', value: email});
    }
    if (draft.mode === 'both' || draft.mode === 'phones') {
      for (const phone of phones) rows.push({type: 'Phone', value: phone});
    }

    const emailDupes = Math.max(0, rawEmails.length - emailMap.size);
    const phoneDupes = Math.max(0, totalPhoneMatches - phoneMap.size);

    return {
      rows,
      uniqueEmails: emails.length,
      uniquePhones: phones.length,
      duplicatesRemoved:
        (draft.mode === 'phones' ? 0 : emailDupes) + (draft.mode === 'emails' ? 0 : phoneDupes),
    };
  }, [draft]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
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
      setDraft((prev) => ({...prev, rawText: content}));
    };
    reader.onerror = () => setFileError(`Failed to read "${file.name}".`);
    reader.readAsText(file);
    e.target.value = '';
  };

  const handleCopyAll = async () => {
    if (extraction.rows.length === 0) return;
    const text = extraction.rows.map((r) => r.value).join('\n');
    await navigator.clipboard.writeText(text);
    setCopiedAll(true);
    setTimeout(() => setCopiedAll(false), 2000);
    onActionSuccess(
      `Copied ${extraction.rows.length} unique contact${extraction.rows.length === 1 ? '' : 's'} to clipboard.`,
      'I cleaned and extracted duplicate-free contacts offline using Spark Office.'
    );
  };

  const handleExportCsv = () => {
    if (extraction.rows.length === 0) return;
    const header = 'Type,Contact';
    const lines = extraction.rows.map((r) => `${sanitizeCsvCell(r.type)},${sanitizeCsvCell(r.value)}`);
    const csvContent = [header, ...lines].join('\r\n');
    const blob = new Blob([csvContent], {type: 'text/csv;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = 'spark-office-contacts.csv';
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    onActionSuccess(
      `Exported ${extraction.rows.length} unique contact${extraction.rows.length === 1 ? '' : 's'} as CSV.`,
      'I exported a clean duplicate-free CSV contact list with Spark Office.'
    );
  };

  const handleCopyOne = async (value: string, index: number) => {
    await navigator.clipboard.writeText(value);
    setCopiedIndex(index);
    setTimeout(() => setCopiedIndex(null), 1500);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Email &amp; Phone Number Extractor
          </h2>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
            Paste messy emails, logs, or notes to extract duplicate-free contacts and export to CSV.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setDraft((prev) => ({...prev, rawText: SAMPLE_MESSY_TEXT}))}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-base font-medium text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
          >
            <Sparkles className="h-4 w-4 text-[#0284C7] dark:text-sky-400" aria-hidden="true" />
            Try Sample
          </button>
          <button
            type="button"
            onClick={() => setDraft((prev) => ({...prev, rawText: ''}))}
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-base font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Clear
          </button>
        </div>
      </div>

      {/* Controls */}
      <div className="flex flex-col gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 lg:flex-row lg:items-center lg:justify-between dark:border-slate-800 dark:bg-[#0B1120]">
        <div className="flex flex-wrap items-center gap-2" role="radiogroup" aria-label="Extraction Type">
          {(
            [
              {id: 'both', label: 'Emails & Phones'},
              {id: 'emails', label: 'Emails Only'},
              {id: 'phones', label: 'Phones Only'},
            ] as const
          ).map((opt) => (
            <button
              key={opt.id}
              type="button"
              role="radio"
              aria-checked={draft.mode === opt.id}
              onClick={() => setDraft((prev) => ({...prev, mode: opt.id}))}
              className={`min-h-[44px] rounded-lg border px-4 py-2 text-base font-medium transition ${
                draft.mode === opt.id
                  ? 'border-[#0284C7] bg-[#0284C7] text-white'
                  : 'border-[#E2E8F0] bg-white text-[#0F172A] hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700'
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap items-center gap-5">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-base font-medium text-[#0F172A] dark:text-[#F8FAFC]">
            <input
              type="checkbox"
              checked={draft.sortAlpha}
              onChange={(e) => setDraft((prev) => ({...prev, sortAlpha: e.target.checked}))}
              className="h-5 w-5 rounded border-slate-300 accent-[#0284C7]"
            />
            Sort A–Z
          </label>
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 text-base font-medium text-[#0F172A] dark:text-[#F8FAFC]">
            <input
              type="checkbox"
              checked={draft.lowercaseEmails}
              onChange={(e) => setDraft((prev) => ({...prev, lowercaseEmails: e.target.checked}))}
              className="h-5 w-5 rounded border-slate-300 accent-[#0284C7]"
            />
            Lowercase Emails
          </label>
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        {/* Source Textarea */}
        <div className="lg:col-span-6">
          <div className="flex items-center justify-between">
            <label htmlFor="extractor-input" className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
              Messy Source Text
            </label>
            <label className="inline-flex min-h-[40px] cursor-pointer items-center gap-1.5 rounded-md px-2.5 py-1 text-sm font-medium text-[#0284C7] hover:bg-[#0284C7]/10 dark:text-sky-400">
              <FileUp className="h-4 w-4" aria-hidden="true" />
              Import Text/CSV
              <input
                type="file"
                accept=".txt,.csv,.log,.eml,.md"
                onChange={handleFileUpload}
                className="sr-only"
              />
            </label>
          </div>
          <textarea
            id="extractor-input"
            rows={13}
            value={draft.rawText}
            onChange={(e) => setDraft((prev) => ({...prev, rawText: e.target.value}))}
            placeholder="Paste emails, CRM dumps, chat transcripts, or spreadsheets here..."
            className="mt-1.5 w-full rounded-xl border border-[#E2E8F0] bg-white p-4 font-mono text-sm leading-relaxed text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
          />
          {fileError && (
            <p role="alert" className="mt-2 text-sm font-medium text-red-600 dark:text-red-400">
              {fileError}
            </p>
          )}
        </div>

        {/* Extracted Results Table */}
        <div className="flex flex-col lg:col-span-6">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="flex flex-wrap items-center gap-2 text-sm font-semibold text-slate-700 tabular-nums dark:text-slate-300">
              <span>{extraction.uniqueEmails} emails</span>
              <span aria-hidden="true">·</span>
              <span>{extraction.uniquePhones} phones</span>
              <span aria-hidden="true">·</span>
              <span className="text-slate-500 dark:text-slate-400">
                {extraction.duplicatesRemoved} duplicates removed
              </span>
            </div>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={handleCopyAll}
                disabled={extraction.rows.length === 0}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-sm font-semibold text-[#0F172A] transition hover:bg-slate-50 disabled:cursor-not-allowed disabled:opacity-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
              >
                {copiedAll ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    Copied
                  </>
                ) : (
                  <>
                    <Copy className="h-4 w-4" aria-hidden="true" />
                    Copy All
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleExportCsv}
                disabled={extraction.rows.length === 0}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0284C7] px-4 py-2 text-sm font-semibold text-white transition hover:bg-[#0369A1] disabled:cursor-not-allowed disabled:opacity-50"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                Export CSV
              </button>
            </div>
          </div>

          <div className="mt-2.5 flex-1 overflow-hidden rounded-xl border border-[#E2E8F0] bg-white dark:border-slate-800 dark:bg-[#0B1120]">
            {extraction.rows.length === 0 ? (
              <div className="flex h-64 items-center justify-center p-6 text-center text-base text-slate-500 dark:text-slate-400">
                No valid {draft.mode === 'emails' ? 'email addresses' : draft.mode === 'phones' ? 'phone numbers' : 'contacts'}{' '}
                found yet. Paste text on the left or click &ldquo;Try Sample&rdquo;.
              </div>
            ) : (
              <div className="max-h-[340px] overflow-y-auto">
                <table className="w-full border-collapse text-left">
                  <thead className="sticky top-0 border-b border-[#E2E8F0] bg-[#F8FAFC] text-xs font-semibold text-slate-600 dark:border-slate-800 dark:bg-[#131C31] dark:text-slate-300">
                    <tr>
                      <th scope="col" className="px-4 py-3">
                        Type
                      </th>
                      <th scope="col" className="px-4 py-3">
                        Unique Value
                      </th>
                      <th scope="col" className="px-4 py-3 text-right">
                        Action
                      </th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[#E2E8F0] text-sm dark:divide-slate-800">
                    {extraction.rows.map((row, idx) => (
                      <tr key={`${row.type}-${row.value}`} className="hover:bg-slate-50 dark:hover:bg-slate-800/50">
                        <td className="px-4 py-2.5 font-medium text-slate-600 dark:text-slate-400">{row.type}</td>
                        <td className="px-4 py-2.5 font-mono text-[#0F172A] break-all dark:text-[#F8FAFC]">
                          {row.value}
                        </td>
                        <td className="px-4 py-2.5 text-right">
                          <button
                            type="button"
                            onClick={() => handleCopyOne(row.value, idx)}
                            aria-label={`Copy ${row.value}`}
                            className="inline-flex min-h-[36px] items-center gap-1 rounded-md px-2.5 py-1 text-xs font-semibold text-[#0284C7] transition hover:bg-[#0284C7]/10 dark:text-sky-400"
                          >
                            {copiedIndex === idx ? 'Copied' : 'Copy'}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
