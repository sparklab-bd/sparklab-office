import React, {useEffect, useMemo, useRef, useState} from 'react';
import {
  Contact,
  Download,
  FileImage,
  FileText,
  ImagePlus,
  Plus,
  RotateCcw,
  Sparkles,
  Trash2,
} from 'lucide-react';
import {
  safeStorageGet,
  safeStorageSet,
  sanitizeHexColor,
  sanitizeUrl,
  validateFileSize,
} from '../utils/security';

declare global {
  interface Window {
    html2pdf?: () => {
      set: (opt: Record<string, unknown>) => {
        from: (el: HTMLElement) => {
          save: () => Promise<void>;
          toCanvas: () => {
            get: (key: 'canvas') => Promise<HTMLCanvasElement>;
          };
        };
      };
    };
  }
}

interface QuoteLineItem {
  id: string;
  description: string;
  qty: number;
  unitPrice: number;
}

interface QuotationState {
  quoteNumber: string;
  issueDate: string;
  validUntil: string;
  currencySymbol: string;
  logoDataUrl: string;
  fromCompany: string;
  fromEmail: string;
  fromPhone: string;
  fromAddress: string;
  clientName: string;
  clientCompany: string;
  clientEmail: string;
  clientAddress: string;
  discountPercent: number;
  taxPercent: number;
  notes: string;
  items: QuoteLineItem[];
}

interface VisitingCardState {
  style: 'light' | 'dark';
  accentColor: string;
  logoDataUrl: string;
  fullName: string;
  role: string;
  company: string;
  tagline: string;
  phone: string;
  email: string;
  website: string;
  location: string;
}

interface Tool5Draft {
  mode: 'quotation' | 'card';
  quotation: QuotationState;
  card: VisitingCardState;
}

const STORAGE_KEY = 'spark_office_quote_card_draft_v1';

const CURRENCIES = [
  {label: 'USD ($)', symbol: '$'},
  {label: 'EUR (€)', symbol: '€'},
  {label: 'GBP (£)', symbol: '£'},
  {label: 'INR (₹)', symbol: '₹'},
  {label: 'BDT (৳)', symbol: '৳'},
  {label: 'JPY (¥)', symbol: '¥'},
];

const SAMPLE_QUOTATION: QuotationState = {
  quoteNumber: 'QT-2026-108',
  issueDate: '2026-11-24',
  validUntil: '2026-12-24',
  currencySymbol: '$',
  logoDataUrl: '',
  fromCompany: 'Northstar Studio LLC',
  fromEmail: 'billing@northstarstudio.example',
  fromPhone: '+1 (415) 890-4421',
  fromAddress: '548 Market St, San Francisco, CA 94104',
  clientName: 'Jordan Rivera',
  clientCompany: 'Brightline Retail Co.',
  clientEmail: 'j.rivera@brightline.example',
  clientAddress: '210 Congress Ave, Austin, TX 78701',
  discountPercent: 5,
  taxPercent: 8.5,
  notes: '50% deposit upon acceptance; remaining balance due within 14 days of final delivery.',
  items: [
    {id: 'item-1', description: 'Brand Identity & Design System Package', qty: 1, unitPrice: 3200},
    {id: 'item-2', description: 'Responsive Web Storefront Implementation', qty: 1, unitPrice: 4800},
    {id: 'item-3', description: 'Quarterly Performance & SEO Audit', qty: 2, unitPrice: 450},
  ],
};

const EMPTY_QUOTATION: QuotationState = {
  quoteNumber: 'QT-2026-001',
  issueDate: new Date().toISOString().slice(0, 10),
  validUntil: '',
  currencySymbol: '$',
  logoDataUrl: '',
  fromCompany: '',
  fromEmail: '',
  fromPhone: '',
  fromAddress: '',
  clientName: '',
  clientCompany: '',
  clientEmail: '',
  clientAddress: '',
  discountPercent: 0,
  taxPercent: 0,
  notes: '',
  items: [{id: 'item-1', description: '', qty: 1, unitPrice: 0}],
};

const SAMPLE_CARD: VisitingCardState = {
  style: 'light',
  accentColor: '#0284C7',
  logoDataUrl: '',
  fullName: 'Maya Lin',
  role: 'Principal Product Architect',
  company: 'Northstar Studio',
  tagline: 'Private-by-design digital systems',
  phone: '+1 (415) 890-4421',
  email: 'maya.lin@northstarstudio.example',
  website: 'northstarstudio.example',
  location: 'San Francisco, CA',
};

const EMPTY_CARD: VisitingCardState = {
  style: 'light',
  accentColor: '#0284C7',
  logoDataUrl: '',
  fullName: '',
  role: '',
  company: '',
  tagline: '',
  phone: '',
  email: '',
  website: '',
  location: '',
};

interface QuotationCardToolProps {
  onActionSuccess: (message: string, shareText?: string) => void;
}

export const QuotationCardTool: React.FC<QuotationCardToolProps> = ({onActionSuccess}) => {
  const [draft, setDraft] = useState<Tool5Draft>(() =>
    safeStorageGet<Tool5Draft>(STORAGE_KEY, {
      mode: 'quotation',
      quotation: SAMPLE_QUOTATION,
      card: SAMPLE_CARD,
    })
  );
  const [uploadError, setUploadError] = useState('');
  const [exporting, setExporting] = useState<'pdf' | 'png' | null>(null);
  const previewRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    safeStorageSet(STORAGE_KEY, draft);
  }, [draft]);

  const totals = useMemo(() => {
    const subtotal = draft.quotation.items.reduce(
      (sum, item) => sum + (Number(item.qty) || 0) * (Number(item.unitPrice) || 0),
      0
    );
    const discountAmt = subtotal * ((Number(draft.quotation.discountPercent) || 0) / 100);
    const afterDiscount = Math.max(0, subtotal - discountAmt);
    const taxAmt = afterDiscount * ((Number(draft.quotation.taxPercent) || 0) / 100);
    const grandTotal = afterDiscount + taxAmt;
    return {subtotal, discountAmt, taxAmt, grandTotal};
  }, [draft.quotation]);

  const formatMoney = (val: number) =>
    `${draft.quotation.currencySymbol}${val.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2,
    })}`;

  const handleLogoUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const err = validateFileSize(file);
    if (err) {
      setUploadError(err);
      e.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('Please upload a PNG, JPG, GIF, or WebP logo image.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        if (draft.mode === 'quotation') {
          setDraft((prev) => ({...prev, quotation: {...prev.quotation, logoDataUrl: result}}));
        } else {
          setDraft((prev) => ({...prev, card: {...prev.card, logoDataUrl: result}}));
        }
      }
    };
    reader.onerror = () => setUploadError('Unable to read the logo file.');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const updateQuotation = <K extends keyof QuotationState>(key: K, val: QuotationState[K]) => {
    setDraft((prev) => ({...prev, quotation: {...prev.quotation, [key]: val}}));
  };

  const updateCard = <K extends keyof VisitingCardState>(key: K, val: VisitingCardState[K]) => {
    setDraft((prev) => ({...prev, card: {...prev.card, [key]: val}}));
  };

  const updateItem = (id: string, patch: Partial<QuoteLineItem>) => {
    setDraft((prev) => ({
      ...prev,
      quotation: {
        ...prev.quotation,
        items: prev.quotation.items.map((it) => (it.id === id ? {...it, ...patch} : it)),
      },
    }));
  };

  const addItem = () => {
    setDraft((prev) => ({
      ...prev,
      quotation: {
        ...prev.quotation,
        items: [
          ...prev.quotation.items,
          {id: `item-${Date.now()}`, description: '', qty: 1, unitPrice: 0},
        ],
      },
    }));
  };

  const removeItem = (id: string) => {
    setDraft((prev) => ({
      ...prev,
      quotation: {
        ...prev.quotation,
        items: prev.quotation.items.length > 1 ? prev.quotation.items.filter((it) => it.id !== id) : prev.quotation.items,
      },
    }));
  };

  const handleDownloadPdf = async () => {
    if (!previewRef.current) return;
    setExporting('pdf');
    setUploadError('');
    try {
      if (typeof window.html2pdf === 'function') {
        const fileName =
          draft.mode === 'quotation'
            ? `${(draft.quotation.quoteNumber || 'quotation').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`
            : `${(draft.card.fullName || 'visiting-card').replace(/[^a-zA-Z0-9_-]/g, '_')}.pdf`;

        await window
          .html2pdf()
          .set({
            margin: draft.mode === 'quotation' ? [10, 10, 10, 10] : [6, 6, 6, 6],
            filename: fileName,
            image: {type: 'jpeg', quality: 0.98},
            html2canvas: {scale: 2, useCORS: true, backgroundColor: null},
            jsPDF: {
              unit: 'mm',
              format: draft.mode === 'quotation' ? 'a4' : [100, 62],
              orientation: draft.mode === 'quotation' ? 'portrait' : 'landscape',
            },
          })
          .from(previewRef.current)
          .save();

        onActionSuccess(
          `${draft.mode === 'quotation' ? 'Quotation' : 'Digital Visiting Card'} PDF downloaded.`,
          'I generated a professional PDF quotation/card privately in my browser using Spark Office.'
        );
      } else {
        window.print();
        onActionSuccess('Opened browser print-to-PDF dialog (offline fallback).');
      }
    } catch (err) {
      setUploadError(
        `PDF export encountered an issue (${(err as Error)?.message || 'unknown'}). You can also use Browser Print → Save as PDF.`
      );
    } finally {
      setExporting(null);
    }
  };

  const drawFallbackCardPng = (): string => {
    const canvas = document.createElement('canvas');
    canvas.width = 1050;
    canvas.height = 600;
    const ctx = canvas.getContext('2d');
    if (!ctx) return '';

    const isDark = draft.card.style === 'dark';
    const accent = sanitizeHexColor(draft.card.accentColor, '#0284C7');
    ctx.fillStyle = isDark ? '#0F172A' : '#FFFFFF';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    ctx.fillStyle = accent;
    ctx.fillRect(0, 0, 24, canvas.height);

    ctx.fillStyle = isDark ? '#F8FAFC' : '#0F172A';
    ctx.font = 'bold 44px sans-serif';
    ctx.fillText(draft.card.fullName || 'Your Name', 72, 140);

    ctx.fillStyle = accent;
    ctx.font = '600 26px sans-serif';
    ctx.fillText([draft.card.role, draft.card.company].filter(Boolean).join(' · '), 72, 192);

    ctx.fillStyle = isDark ? '#CBD5E1' : '#334155';
    ctx.font = '24px sans-serif';
    const lines = [draft.card.phone, draft.card.email, draft.card.website, draft.card.location].filter(Boolean);
    lines.forEach((line, i) => ctx.fillText(line, 72, 320 + i * 48));

    return canvas.toDataURL('image/png');
  };

  const handleDownloadPng = async () => {
    if (!previewRef.current) return;
    setExporting('png');
    setUploadError('');
    try {
      let dataUrl = '';
      if (typeof window.html2pdf === 'function') {
        const canvas = await window
          .html2pdf()
          .set({
            html2canvas: {scale: 3, useCORS: true, backgroundColor: null},
          })
          .from(previewRef.current)
          .toCanvas()
          .get('canvas');
        dataUrl = canvas.toDataURL('image/png');
      } else if (draft.mode === 'card') {
        dataUrl = drawFallbackCardPng();
      } else {
        setUploadError('PNG export requires html2pdf.js to be cached. Try PDF / Print while offline.');
        setExporting(null);
        return;
      }

      if (dataUrl) {
        const link = document.createElement('a');
        link.href = dataUrl;
        link.download =
          draft.mode === 'quotation'
            ? `${(draft.quotation.quoteNumber || 'quotation').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`
            : `${(draft.card.fullName || 'visiting-card').replace(/[^a-zA-Z0-9_-]/g, '_')}.png`;
        document.body.appendChild(link);
        link.click();
        document.body.removeChild(link);

        onActionSuccess(
          `${draft.mode === 'quotation' ? 'Quotation' : 'Digital Visiting Card'} PNG downloaded.`,
          'I created a crisp business card / quotation PNG using Spark Office.'
        );
      }
    } catch (err) {
      setUploadError(`PNG export failed: ${(err as Error)?.message || 'Please try PDF download.'}`);
    } finally {
      setExporting(null);
    }
  };

  const handleDownloadVCard = () => {
    const c = draft.card;
    const vcf = [
      'BEGIN:VCARD',
      'VERSION:3.0',
      `FN:${c.fullName.trim() || 'Contact'}`,
      c.company.trim() ? `ORG:${c.company.trim()}` : '',
      c.role.trim() ? `TITLE:${c.role.trim()}` : '',
      c.phone.trim() ? `TEL;TYPE=WORK,VOICE:${c.phone.trim()}` : '',
      c.email.trim() ? `EMAIL;TYPE=PREF,INTERNET:${c.email.trim()}` : '',
      c.website.trim() ? `URL:${sanitizeUrl(c.website)}` : '',
      c.location.trim() ? `ADR;TYPE=WORK:;;${c.location.trim()};;;;` : '',
      'END:VCARD',
    ]
      .filter(Boolean)
      .join('\r\n');

    const blob = new Blob([vcf], {type: 'text/vcard;charset=utf-8;'});
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `${(c.fullName || 'contact').replace(/[^a-zA-Z0-9_-]/g, '_')}.vcf`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
    onActionSuccess('Contact vCard (.vcf) downloaded.');
  };

  const activeLogo =
    draft.mode === 'quotation'
      ? sanitizeUrl(draft.quotation.logoDataUrl, true)
      : sanitizeUrl(draft.card.logoDataUrl, true);
  const cardAccent = sanitizeHexColor(draft.card.accentColor, '#0284C7');

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="no-print flex flex-col gap-4 border-b border-[#E2E8F0] pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Quotation &amp; Digital Visiting Card Maker
          </h2>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
            Create itemized business quotes or digital visiting cards with logo upload and instant PDF/PNG export.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() =>
              setDraft((prev) =>
                prev.mode === 'quotation'
                  ? {...prev, quotation: SAMPLE_QUOTATION}
                  : {...prev, card: SAMPLE_CARD}
              )
            }
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-base font-medium text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
          >
            <Sparkles className="h-4 w-4 text-[#0284C7] dark:text-sky-400" aria-hidden="true" />
            Try Sample
          </button>
          <button
            type="button"
            onClick={() =>
              setDraft((prev) =>
                prev.mode === 'quotation'
                  ? {...prev, quotation: EMPTY_QUOTATION}
                  : {...prev, card: EMPTY_CARD}
              )
            }
            className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-base font-medium text-slate-700 transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700"
          >
            <RotateCcw className="h-4 w-4" aria-hidden="true" />
            Reset
          </button>
        </div>
      </div>

      {/* Mode Switcher */}
      <div className="no-print flex flex-wrap items-center justify-between gap-4 rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-3 dark:border-slate-800 dark:bg-[#0B1120]">
        <div className="flex flex-wrap gap-2" role="tablist" aria-label="Document Mode">
          <button
            type="button"
            role="tab"
            aria-selected={draft.mode === 'quotation'}
            onClick={() => setDraft((prev) => ({...prev, mode: 'quotation'}))}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-base font-semibold transition ${
              draft.mode === 'quotation'
                ? 'bg-[#0284C7] text-white'
                : 'bg-white text-[#0F172A] hover:bg-slate-100 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700'
            }`}
          >
            <FileText className="h-4 w-4" aria-hidden="true" />
            Business Quotation
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={draft.mode === 'card'}
            onClick={() => setDraft((prev) => ({...prev, mode: 'card'}))}
            className={`inline-flex min-h-[44px] items-center gap-2 rounded-lg px-4 py-2 text-base font-semibold transition ${
              draft.mode === 'card'
                ? 'bg-[#0284C7] text-white'
                : 'bg-white text-[#0F172A] hover:bg-slate-100 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700'
            }`}
          >
            <Contact className="h-4 w-4" aria-hidden="true" />
            Digital Visiting Card
          </button>
        </div>

        {/* Logo Upload Control */}
        <div className="flex items-center gap-2">
          <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-sm font-semibold text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700">
            <ImagePlus className="h-4 w-4 text-[#0284C7] dark:text-sky-400" aria-hidden="true" />
            <span>{activeLogo ? 'Change Logo' : 'Upload Company Logo'}</span>
            <input type="file" accept="image/*" onChange={handleLogoUpload} className="sr-only" />
          </label>
          {activeLogo && (
            <button
              type="button"
              onClick={() =>
                draft.mode === 'quotation' ? updateQuotation('logoDataUrl', '') : updateCard('logoDataUrl', '')
              }
              aria-label="Remove logo"
              className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#E2E8F0] bg-white text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:bg-slate-800 dark:text-red-400"
            >
              <Trash2 className="h-4 w-4" aria-hidden="true" />
            </button>
          )}
        </div>
      </div>

      {uploadError && (
        <p role="alert" className="no-print text-sm font-medium text-red-600 dark:text-red-400">
          {uploadError}
        </p>
      )}

      {/* Editor & Live Preview Grid */}
      <div className="grid grid-cols-1 gap-8 xl:grid-cols-12">
        {/* Left: Form Inputs */}
        <div className="no-print space-y-5 xl:col-span-5">
          {draft.mode === 'quotation' ? (
            <>
              {/* Quote Meta */}
              <div className="grid grid-cols-2 gap-3">
                <div>
                  <label htmlFor="qt-num" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Quote #
                  </label>
                  <input
                    id="qt-num"
                    type="text"
                    value={draft.quotation.quoteNumber}
                    onChange={(e) => updateQuotation('quoteNumber', e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label htmlFor="qt-curr" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Currency
                  </label>
                  <select
                    id="qt-curr"
                    value={draft.quotation.currencySymbol}
                    onChange={(e) => updateQuotation('currencySymbol', e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                  >
                    {CURRENCIES.map((c) => (
                      <option key={c.label} value={c.symbol}>
                        {c.label}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label htmlFor="qt-date" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Issue Date
                  </label>
                  <input
                    id="qt-date"
                    type="date"
                    value={draft.quotation.issueDate}
                    onChange={(e) => updateQuotation('issueDate', e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label htmlFor="qt-valid" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Valid Until
                  </label>
                  <input
                    id="qt-valid"
                    type="date"
                    value={draft.quotation.validUntil}
                    onChange={(e) => updateQuotation('validUntil', e.target.value)}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                  />
                </div>
              </div>

              {/* From Company */}
              <div className="space-y-3 border-t border-[#E2E8F0] pt-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Your Business Details</h3>
                <input
                  type="text"
                  aria-label="Your Company Name"
                  value={draft.quotation.fromCompany}
                  onChange={(e) => updateQuotation('fromCompany', e.target.value)}
                  placeholder="Your Company Name"
                  className="min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                />
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="email"
                    aria-label="Your Company Email"
                    value={draft.quotation.fromEmail}
                    onChange={(e) => updateQuotation('fromEmail', e.target.value)}
                    placeholder="Business Email"
                    className="min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                  />
                  <input
                    type="tel"
                    aria-label="Your Company Phone"
                    value={draft.quotation.fromPhone}
                    onChange={(e) => updateQuotation('fromPhone', e.target.value)}
                    placeholder="Business Phone"
                    className="min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                  />
                </div>
                <input
                  type="text"
                  aria-label="Your Company Address"
                  value={draft.quotation.fromAddress}
                  onChange={(e) => updateQuotation('fromAddress', e.target.value)}
                  placeholder="Business Address"
                  className="min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                />
              </div>

              {/* Client Details */}
              <div className="space-y-3 border-t border-[#E2E8F0] pt-4 dark:border-slate-800">
                <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Bill To (Client)</h3>
                <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                  <input
                    type="text"
                    aria-label="Client Name"
                    value={draft.quotation.clientName}
                    onChange={(e) => updateQuotation('clientName', e.target.value)}
                    placeholder="Client Name"
                    className="min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                  />
                  <input
                    type="text"
                    aria-label="Client Company"
                    value={draft.quotation.clientCompany}
                    onChange={(e) => updateQuotation('clientCompany', e.target.value)}
                    placeholder="Client Company"
                    className="min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                  />
                </div>
                <input
                  type="email"
                  aria-label="Client Email"
                  value={draft.quotation.clientEmail}
                  onChange={(e) => updateQuotation('clientEmail', e.target.value)}
                  placeholder="Client Email"
                  className="min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                />
                <input
                  type="text"
                  aria-label="Client Address"
                  value={draft.quotation.clientAddress}
                  onChange={(e) => updateQuotation('clientAddress', e.target.value)}
                  placeholder="Client Address"
                  className="min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                />
              </div>

              {/* Line Items */}
              <div className="space-y-3 border-t border-[#E2E8F0] pt-4 dark:border-slate-800">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Line Items</h3>
                  <button
                    type="button"
                    onClick={addItem}
                    className="inline-flex min-h-[40px] items-center gap-1.5 rounded-lg bg-[#0284C7]/10 px-3 py-1.5 text-sm font-semibold text-[#0284C7] hover:bg-[#0284C7]/20 dark:text-sky-400"
                  >
                    <Plus className="h-4 w-4" aria-hidden="true" />
                    Add Item
                  </button>
                </div>

                <div className="space-y-2.5">
                  {draft.quotation.items.map((item, idx) => (
                    <div
                      key={item.id}
                      className="grid grid-cols-12 items-center gap-2 rounded-lg border border-[#E2E8F0] bg-[#F8FAFC] p-2.5 dark:border-slate-700 dark:bg-[#0B1120]"
                    >
                      <input
                        type="text"
                        aria-label={`Item ${idx + 1} description`}
                        value={item.description}
                        onChange={(e) => updateItem(item.id, {description: e.target.value})}
                        placeholder="Service or item description"
                        className="col-span-12 min-h-[40px] rounded border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-sm text-[#0F172A] sm:col-span-6 dark:border-slate-700 dark:bg-[#131C31] dark:text-[#F8FAFC]"
                      />
                      <input
                        type="number"
                        min={0}
                        step={1}
                        aria-label={`Item ${idx + 1} quantity`}
                        value={item.qty}
                        onChange={(e) => updateItem(item.id, {qty: Number(e.target.value)})}
                        placeholder="Qty"
                        className="col-span-4 min-h-[40px] rounded border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-sm tabular-nums text-[#0F172A] sm:col-span-2 dark:border-slate-700 dark:bg-[#131C31] dark:text-[#F8FAFC]"
                      />
                      <input
                        type="number"
                        min={0}
                        step="0.01"
                        aria-label={`Item ${idx + 1} unit price`}
                        value={item.unitPrice}
                        onChange={(e) => updateItem(item.id, {unitPrice: Number(e.target.value)})}
                        placeholder="Price"
                        className="col-span-6 min-h-[40px] rounded border border-[#E2E8F0] bg-white px-2.5 py-1.5 text-sm tabular-nums text-[#0F172A] sm:col-span-3 dark:border-slate-700 dark:bg-[#131C31] dark:text-[#F8FAFC]"
                      />
                      <button
                        type="button"
                        onClick={() => removeItem(item.id)}
                        disabled={draft.quotation.items.length <= 1}
                        aria-label={`Remove item ${idx + 1}`}
                        className="col-span-2 inline-flex min-h-[40px] items-center justify-center rounded text-red-600 hover:bg-red-50 disabled:opacity-30 sm:col-span-1 dark:text-red-400"
                      >
                        <Trash2 className="h-4 w-4" aria-hidden="true" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>

              {/* Discount, Tax & Notes */}
              <div className="grid grid-cols-2 gap-3 border-t border-[#E2E8F0] pt-4 dark:border-slate-800">
                <div>
                  <label htmlFor="qt-disc" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Discount (%)
                  </label>
                  <input
                    id="qt-disc"
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={draft.quotation.discountPercent}
                    onChange={(e) => updateQuotation('discountPercent', Number(e.target.value))}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-base tabular-nums text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                  />
                </div>
                <div>
                  <label htmlFor="qt-tax" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Tax / VAT (%)
                  </label>
                  <input
                    id="qt-tax"
                    type="number"
                    min={0}
                    max={100}
                    step="0.5"
                    value={draft.quotation.taxPercent}
                    onChange={(e) => updateQuotation('taxPercent', Number(e.target.value))}
                    className="mt-1 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3 py-2 text-base tabular-nums text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                  />
                </div>
                <div className="col-span-2">
                  <label htmlFor="qt-notes" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                    Payment Terms &amp; Notes
                  </label>
                  <textarea
                    id="qt-notes"
                    rows={2}
                    value={draft.quotation.notes}
                    onChange={(e) => updateQuotation('notes', e.target.value)}
                    placeholder="Payment schedule, terms, or thank you note..."
                    className="mt-1 w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                  />
                </div>
              </div>
            </>
          ) : (
            /* Digital Visiting Card Form */
            <div className="space-y-4">
              <div>
                <span className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Card Theme</span>
                <div className="mt-2 grid grid-cols-2 gap-2">
                  <button
                    type="button"
                    onClick={() => updateCard('style', 'light')}
                    className={`min-h-[44px] rounded-lg border px-4 py-2 text-base font-medium ${
                      draft.card.style === 'light'
                        ? 'border-[#0284C7] bg-[#0284C7]/10 text-[#0284C7] dark:text-sky-300'
                        : 'border-[#E2E8F0] bg-white text-[#0F172A] dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC]'
                    }`}
                  >
                    Clean White
                  </button>
                  <button
                    type="button"
                    onClick={() => updateCard('style', 'dark')}
                    className={`min-h-[44px] rounded-lg border px-4 py-2 text-base font-medium ${
                      draft.card.style === 'dark'
                        ? 'border-[#0284C7] bg-[#0284C7]/10 text-[#0284C7] dark:text-sky-300'
                        : 'border-[#E2E8F0] bg-white text-[#0F172A] dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC]'
                    }`}
                  >
                    Executive Dark
                  </button>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <input
                  type="text"
                  aria-label="Full Name"
                  value={draft.card.fullName}
                  onChange={(e) => updateCard('fullName', e.target.value)}
                  placeholder="Full Name"
                  className="min-h-[44px] rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                />
                <input
                  type="text"
                  aria-label="Job Title"
                  value={draft.card.role}
                  onChange={(e) => updateCard('role', e.target.value)}
                  placeholder="Role / Title"
                  className="min-h-[44px] rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                />
                <input
                  type="text"
                  aria-label="Company Name"
                  value={draft.card.company}
                  onChange={(e) => updateCard('company', e.target.value)}
                  placeholder="Company Name"
                  className="min-h-[44px] rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                />
                <input
                  type="text"
                  aria-label="Tagline"
                  value={draft.card.tagline}
                  onChange={(e) => updateCard('tagline', e.target.value)}
                  placeholder="Short Tagline"
                  className="min-h-[44px] rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                />
                <input
                  type="tel"
                  aria-label="Phone Number"
                  value={draft.card.phone}
                  onChange={(e) => updateCard('phone', e.target.value)}
                  placeholder="Phone Number"
                  className="min-h-[44px] rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                />
                <input
                  type="email"
                  aria-label="Email Address"
                  value={draft.card.email}
                  onChange={(e) => updateCard('email', e.target.value)}
                  placeholder="Email Address"
                  className="min-h-[44px] rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                />
                <input
                  type="text"
                  aria-label="Website"
                  value={draft.card.website}
                  onChange={(e) => updateCard('website', e.target.value)}
                  placeholder="Website"
                  className="min-h-[44px] rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                />
                <input
                  type="text"
                  aria-label="City or Address"
                  value={draft.card.location}
                  onChange={(e) => updateCard('location', e.target.value)}
                  placeholder="Location"
                  className="min-h-[44px] rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
                />
              </div>

              <div>
                <label htmlFor="card-accent" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                  Accent Color
                </label>
                <div className="mt-2 flex items-center gap-3">
                  <input
                    id="card-accent"
                    type="color"
                    value={cardAccent}
                    onChange={(e) => updateCard('accentColor', e.target.value)}
                    className="h-10 w-12 cursor-pointer rounded border border-[#E2E8F0] p-0.5 dark:border-slate-700"
                  />
                  <span className="font-mono text-sm text-slate-600 dark:text-slate-300">{cardAccent}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {/* Right: Printable / Exportable Preview (Uses explicit Hex colors so html2canvas never encounters oklch) */}
        <div className="space-y-4 xl:col-span-7">
          <div className="no-print flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
              Live Export Preview ({draft.mode === 'quotation' ? 'A4 Quotation' : '3.5" × 2" Card'})
            </h3>

            <div className="flex flex-wrap items-center gap-2.5">
              <button
                type="button"
                onClick={handleDownloadPdf}
                disabled={exporting !== null}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0284C7] px-4 py-2 text-base font-semibold text-white transition hover:bg-[#0369A1] disabled:opacity-60"
              >
                <Download className="h-4 w-4" aria-hidden="true" />
                {exporting === 'pdf' ? 'Generating PDF...' : 'Download PDF'}
              </button>

              <button
                type="button"
                onClick={handleDownloadPng}
                disabled={exporting !== null}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-base font-semibold text-[#0F172A] transition hover:bg-slate-50 disabled:opacity-60 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
              >
                <FileImage className="h-4 w-4 text-[#0284C7] dark:text-sky-400" aria-hidden="true" />
                {exporting === 'png' ? 'Rendering PNG...' : 'Download PNG'}
              </button>

              {draft.mode === 'card' && (
                <button
                  type="button"
                  onClick={handleDownloadVCard}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2 text-base font-medium text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
                >
                  Save .VCF
                </button>
              )}
            </div>
          </div>

          <div className="overflow-x-auto rounded-xl border border-[#E2E8F0] bg-[#E2E8F0]/40 p-4 sm:p-6 dark:border-slate-800 dark:bg-[#0B1120]">
            {draft.mode === 'quotation' ? (
              /* Explicit hex inline styles inside #spark-export-canvas for 100% html2canvas/html2pdf compatibility */
              <div
                ref={previewRef}
                style={{
                  backgroundColor: '#FFFFFF',
                  color: '#0F172A',
                  border: '1px solid #E2E8F0',
                  borderRadius: '12px',
                  padding: '32px',
                  minWidth: '580px',
                  fontFamily: 'Arial, Helvetica, sans-serif',
                }}
              >
                {/* Quote Top Header */}
                <div
                  style={{
                    display: 'flex',
                    justifyContent: 'space-between',
                    alignItems: 'flex-start',
                    borderBottom: '2px solid #0284C7',
                    paddingBottom: '20px',
                    gap: '16px',
                  }}
                >
                  <div style={{display: 'flex', alignItems: 'center', gap: '14px'}}>
                    {activeLogo && (
                      <img
                        src={activeLogo}
                        alt="Company Logo"
                        style={{
                          width: '56px',
                          height: '56px',
                          objectFit: 'contain',
                          borderRadius: '8px',
                          border: '1px solid #E2E8F0',
                        }}
                      />
                    )}
                    <div>
                      <div style={{fontSize: '20px', fontWeight: 800, color: '#0F172A'}}>
                        {draft.quotation.fromCompany || 'Your Company Name'}
                      </div>
                      <div style={{fontSize: '12px', color: '#475569', marginTop: '4px'}}>
                        {[draft.quotation.fromEmail, draft.quotation.fromPhone].filter(Boolean).join(' · ')}
                      </div>
                      {draft.quotation.fromAddress && (
                        <div style={{fontSize: '12px', color: '#64748B', marginTop: '2px'}}>
                          {draft.quotation.fromAddress}
                        </div>
                      )}
                    </div>
                  </div>

                  <div style={{textAlign: 'right'}}>
                    <div
                      style={{
                        fontSize: '24px',
                        fontWeight: 800,
                        color: '#0284C7',
                        letterSpacing: '-0.02em',
                      }}
                    >
                      QUOTATION
                    </div>
                    <div style={{fontSize: '13px', fontWeight: 700, color: '#0F172A', marginTop: '4px'}}>
                      #{draft.quotation.quoteNumber || 'QT-001'}
                    </div>
                    <div style={{fontSize: '12px', color: '#64748B', marginTop: '2px'}}>
                      Issued: {draft.quotation.issueDate || '—'}
                    </div>
                    {draft.quotation.validUntil && (
                      <div style={{fontSize: '12px', color: '#64748B'}}>
                        Valid Until: {draft.quotation.validUntil}
                      </div>
                    )}
                  </div>
                </div>

                {/* Client Block */}
                <div style={{marginTop: '20px', marginBottom: '20px'}}>
                  <div style={{fontSize: '11px', fontWeight: 700, color: '#64748B', textTransform: 'uppercase'}}>
                    Prepared For
                  </div>
                  <div style={{fontSize: '15px', fontWeight: 700, color: '#0F172A', marginTop: '4px'}}>
                    {draft.quotation.clientName || 'Client Name'}
                    {draft.quotation.clientCompany ? ` — ${draft.quotation.clientCompany}` : ''}
                  </div>
                  {draft.quotation.clientEmail && (
                    <div style={{fontSize: '12px', color: '#475569', marginTop: '2px'}}>
                      {draft.quotation.clientEmail}
                    </div>
                  )}
                  {draft.quotation.clientAddress && (
                    <div style={{fontSize: '12px', color: '#64748B', marginTop: '2px'}}>
                      {draft.quotation.clientAddress}
                    </div>
                  )}
                </div>

                {/* Items Table */}
                <table style={{width: '100%', borderCollapse: 'collapse', fontSize: '13px'}}>
                  <thead>
                    <tr style={{backgroundColor: '#F8FAFC', borderBottom: '1px solid #CBD5E1'}}>
                      <th style={{padding: '10px 8px', textAlign: 'left', color: '#334155', fontWeight: 700}}>
                        Description
                      </th>
                      <th style={{padding: '10px 8px', textAlign: 'right', color: '#334155', fontWeight: 700}}>
                        Qty
                      </th>
                      <th style={{padding: '10px 8px', textAlign: 'right', color: '#334155', fontWeight: 700}}>
                        Unit Price
                      </th>
                      <th style={{padding: '10px 8px', textAlign: 'right', color: '#334155', fontWeight: 700}}>
                        Total
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {draft.quotation.items.map((item) => {
                      const lineTotal = (Number(item.qty) || 0) * (Number(item.unitPrice) || 0);
                      return (
                        <tr key={item.id} style={{borderBottom: '1px solid #E2E8F0'}}>
                          <td style={{padding: '10px 8px', color: '#0F172A'}}>
                            {item.description || 'Line item'}
                          </td>
                          <td style={{padding: '10px 8px', textAlign: 'right', color: '#334155'}}>
                            {Number(item.qty) || 0}
                          </td>
                          <td style={{padding: '10px 8px', textAlign: 'right', color: '#334155'}}>
                            {formatMoney(Number(item.unitPrice) || 0)}
                          </td>
                          <td style={{padding: '10px 8px', textAlign: 'right', fontWeight: 600, color: '#0F172A'}}>
                            {formatMoney(lineTotal)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>

                {/* Totals */}
                <div style={{display: 'flex', justifyContent: 'flex-end', marginTop: '20px'}}>
                  <div style={{width: '240px', fontSize: '13px'}}>
                    <div style={{display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#475569'}}>
                      <span>Subtotal</span>
                      <span>{formatMoney(totals.subtotal)}</span>
                    </div>
                    {draft.quotation.discountPercent > 0 && (
                      <div
                        style={{display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#059669'}}
                      >
                        <span>Discount ({draft.quotation.discountPercent}%)</span>
                        <span>-{formatMoney(totals.discountAmt)}</span>
                      </div>
                    )}
                    {draft.quotation.taxPercent > 0 && (
                      <div
                        style={{display: 'flex', justifyContent: 'space-between', padding: '4px 0', color: '#475569'}}
                      >
                        <span>Tax ({draft.quotation.taxPercent}%)</span>
                        <span>{formatMoney(totals.taxAmt)}</span>
                      </div>
                    )}
                    <div
                      style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        padding: '10px 0 4px',
                        marginTop: '6px',
                        borderTop: '2px solid #0F172A',
                        fontSize: '16px',
                        fontWeight: 800,
                        color: '#0F172A',
                      }}
                    >
                      <span>Total</span>
                      <span style={{color: '#0284C7'}}>{formatMoney(totals.grandTotal)}</span>
                    </div>
                  </div>
                </div>

                {/* Notes */}
                {draft.quotation.notes && (
                  <div
                    style={{
                      marginTop: '24px',
                      paddingTop: '14px',
                      borderTop: '1px solid #E2E8F0',
                      fontSize: '12px',
                      color: '#475569',
                      lineHeight: 1.5,
                    }}
                  >
                    <strong style={{color: '#0F172A'}}>Terms &amp; Notes:</strong> {draft.quotation.notes}
                  </div>
                )}
              </div>
            ) : (
              /* Digital Visiting Card Preview */
              <div className="flex justify-center py-4">
                <div
                  ref={previewRef}
                  style={{
                    width: '100%',
                    maxWidth: '460px',
                    minHeight: '264px',
                    backgroundColor: draft.card.style === 'dark' ? '#0F172A' : '#FFFFFF',
                    color: draft.card.style === 'dark' ? '#F8FAFC' : '#0F172A',
                    borderRadius: '16px',
                    border: draft.card.style === 'dark' ? '1px solid #1E293B' : '1px solid #CBD5E1',
                    borderLeft: `10px solid ${cardAccent}`,
                    padding: '28px',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'space-between',
                    fontFamily: 'Arial, Helvetica, sans-serif',
                    boxShadow: '0 8px 24px rgba(15, 23, 42, 0.08)',
                  }}
                >
                  <div style={{display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px'}}>
                    <div>
                      <div style={{fontSize: '22px', fontWeight: 800, lineHeight: 1.2}}>
                        {draft.card.fullName || 'Your Name'}
                      </div>
                      <div style={{fontSize: '14px', fontWeight: 700, color: cardAccent, marginTop: '4px'}}>
                        {[draft.card.role, draft.card.company].filter(Boolean).join(' · ') || 'Title · Company'}
                      </div>
                      {draft.card.tagline && (
                        <div
                          style={{
                            fontSize: '12px',
                            color: draft.card.style === 'dark' ? '#94A3B8' : '#64748B',
                            marginTop: '6px',
                          }}
                        >
                          {draft.card.tagline}
                        </div>
                      )}
                    </div>

                    {activeLogo && (
                      <img
                        src={activeLogo}
                        alt="Company Logo"
                        style={{
                          width: '52px',
                          height: '52px',
                          objectFit: 'contain',
                          borderRadius: '10px',
                          backgroundColor: '#FFFFFF',
                          padding: '4px',
                          border: '1px solid #E2E8F0',
                          flexShrink: 0,
                        }}
                      />
                    )}
                  </div>

                  <div
                    style={{
                      marginTop: '24px',
                      paddingTop: '14px',
                      borderTop: draft.card.style === 'dark' ? '1px solid #1E293B' : '1px solid #E2E8F0',
                      display: 'grid',
                      gridTemplateColumns: '1fr 1fr',
                      gap: '8px 16px',
                      fontSize: '13px',
                      color: draft.card.style === 'dark' ? '#CBD5E1' : '#334155',
                    }}
                  >
                    {draft.card.phone && <div>{draft.card.phone}</div>}
                    {draft.card.email && <div style={{wordBreak: 'break-all'}}>{draft.card.email}</div>}
                    {draft.card.website && <div style={{color: cardAccent}}>{draft.card.website}</div>}
                    {draft.card.location && <div>{draft.card.location}</div>}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
