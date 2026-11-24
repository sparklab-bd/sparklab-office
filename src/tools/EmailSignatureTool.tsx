import React, {useEffect, useMemo, useState} from 'react';
import {Check, Code2, Copy, ImagePlus, RotateCcw, Sparkles, Trash2} from 'lucide-react';
import {
  escapeHtml,
  safeStorageGet,
  safeStorageSet,
  sanitizeHexColor,
  sanitizeUrl,
  validateFileSize,
} from '../utils/security';

export interface SignatureDraft {
  template: 'classic' | 'modern' | 'minimal';
  fullName: string;
  jobTitle: string;
  company: string;
  email: string;
  phone: string;
  website: string;
  location: string;
  accentColor: string;
  avatarDataUrl: string;
  linkedin: string;
  twitter: string;
  github: string;
  instagram: string;
}

const STORAGE_KEY = 'spark_office_sig_draft_v1';

const EMPTY_DRAFT: SignatureDraft = {
  template: 'classic',
  fullName: '',
  jobTitle: '',
  company: '',
  email: '',
  phone: '',
  website: '',
  location: '',
  accentColor: '#0284C7',
  avatarDataUrl: '',
  linkedin: '',
  twitter: '',
  github: '',
  instagram: '',
};

const SAMPLE_DRAFT: SignatureDraft = {
  template: 'classic',
  fullName: 'Maya Lin',
  jobTitle: 'VP of Product Partnerships',
  company: 'Northstar Logistics Group',
  email: 'maya.lin@northstarlogistics.example',
  phone: '+1 (415) 890-4421',
  website: 'https://northstarlogistics.example',
  location: 'San Francisco, CA',
  accentColor: '#0284C7',
  avatarDataUrl: '',
  linkedin: 'https://linkedin.com/in/mayalin',
  twitter: 'https://x.com/mayalin',
  github: '',
  instagram: '',
};

const COLOR_PRESETS = ['#0284C7', '#0F172A', '#059669', '#4F46E5', '#B45309', '#BE123C'];

interface EmailSignatureToolProps {
  onActionSuccess: (message: string, shareText?: string) => void;
}

function buildSafeSignatureHtml(draft: SignatureDraft): string {
  const accent = sanitizeHexColor(draft.accentColor, '#0284C7');
  const name = escapeHtml(draft.fullName.trim() || 'Your Name');
  const title = escapeHtml(draft.jobTitle.trim());
  const company = escapeHtml(draft.company.trim());
  const emailRaw = draft.email.trim();
  const email = escapeHtml(emailRaw);
  const phoneRaw = draft.phone.trim();
  const phone = escapeHtml(phoneRaw);
  const websiteHref = sanitizeUrl(draft.website);
  const websiteLabel = escapeHtml(draft.website.replace(/^https?:\/\//i, '').replace(/\/$/, ''));
  const location = escapeHtml(draft.location.trim());
  const avatarSrc = sanitizeUrl(draft.avatarDataUrl, true);

  const socials = [
    {label: 'LinkedIn', href: sanitizeUrl(draft.linkedin)},
    {label: 'X / Twitter', href: sanitizeUrl(draft.twitter)},
    {label: 'GitHub', href: sanitizeUrl(draft.github)},
    {label: 'Instagram', href: sanitizeUrl(draft.instagram)},
  ].filter((s) => Boolean(s.href));

  const socialHtml = socials.length
    ? `<div style="margin-top:8px;font-size:12px;line-height:1.4;">${socials
        .map(
          (s) =>
            `<a href="${escapeHtml(s.href)}" target="_blank" rel="noopener noreferrer" style="color:${accent};text-decoration:none;font-weight:600;margin-right:12px;">${escapeHtml(s.label)}</a>`
        )
        .join('')}</div>`
    : '';

  const contactItems: string[] = [];
  if (email) {
    contactItems.push(
      `<a href="mailto:${escapeHtml(emailRaw)}" style="color:#334155;text-decoration:none;">${email}</a>`
    );
  }
  if (phone) {
    contactItems.push(
      `<a href="tel:${escapeHtml(phoneRaw.replace(/[^+\d]/g, ''))}" style="color:#334155;text-decoration:none;">${phone}</a>`
    );
  }
  if (websiteHref && websiteLabel) {
    contactItems.push(
      `<a href="${escapeHtml(websiteHref)}" target="_blank" rel="noopener noreferrer" style="color:${accent};text-decoration:none;">${websiteLabel}</a>`
    );
  }
  if (location) {
    contactItems.push(`<span style="color:#64748B;">${location}</span>`);
  }

  const avatarCell = avatarSrc
    ? `<td style="vertical-align:top;padding-right:16px;"><img src="${escapeHtml(avatarSrc)}" alt="${name}" width="72" height="72" style="width:72px;height:72px;border-radius:12px;object-fit:cover;display:block;border:1px solid #E2E8F0;" /></td>`
    : '';

  const roleLine = [title, company].filter(Boolean).join(' · ');

  if (draft.template === 'modern') {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:#0F172A;border-collapse:collapse;max-width:540px;border:1px solid #E2E8F0;border-radius:10px;">
  <tr>
    <td style="padding:16px 20px;background-color:#F8FAFC;border-bottom:2px solid ${accent};">
      <table cellpadding="0" cellspacing="0" border="0" style="border-collapse:collapse;">
        <tr>
          ${avatarCell}
          <td style="vertical-align:middle;">
            <div style="font-size:18px;font-weight:700;color:#0F172A;line-height:1.25;">${name}</div>
            ${roleLine ? `<div style="font-size:13px;font-weight:600;color:${accent};margin-top:3px;">${roleLine}</div>` : ''}
          </td>
        </tr>
      </table>
    </td>
  </tr>
  <tr>
    <td style="padding:14px 20px;background-color:#FFFFFF;font-size:13px;line-height:1.6;color:#334155;">
      ${contactItems.length ? `<div>${contactItems.join(' &nbsp;|&nbsp; ')}</div>` : ''}
      ${socialHtml}
    </td>
  </tr>
</table>`;
  }

  if (draft.template === 'minimal') {
    return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:#0F172A;border-collapse:collapse;max-width:520px;">
  <tr>
    ${avatarCell}
    <td style="vertical-align:top;">
      <div style="font-size:17px;font-weight:700;color:#0F172A;line-height:1.3;">${name}</div>
      ${roleLine ? `<div style="font-size:13px;color:#475569;margin-top:2px;">${roleLine}</div>` : ''}
      ${contactItems.length ? `<div style="font-size:13px;color:#334155;margin-top:8px;line-height:1.5;">${contactItems.join(' &nbsp;·&nbsp; ')}</div>` : ''}
      ${socialHtml}
    </td>
  </tr>
</table>`;
  }

  // Classic Left-Border template
  return `<table cellpadding="0" cellspacing="0" border="0" style="font-family:Arial,Helvetica,sans-serif;color:#0F172A;border-collapse:collapse;max-width:520px;">
  <tr>
    ${avatarCell}
    <td style="vertical-align:top;border-left:3px solid ${accent};padding-left:14px;">
      <div style="font-size:18px;font-weight:700;color:#0F172A;line-height:1.25;">${name}</div>
      ${roleLine ? `<div style="font-size:13px;font-weight:600;color:${accent};margin-top:3px;">${roleLine}</div>` : ''}
      ${contactItems.length ? `<div style="font-size:13px;color:#334155;margin-top:8px;line-height:1.55;">${contactItems.join('<br />')}</div>` : ''}
      ${socialHtml}
    </td>
  </tr>
</table>`;
}

export const EmailSignatureTool: React.FC<EmailSignatureToolProps> = ({onActionSuccess}) => {
  const [draft, setDraft] = useState<SignatureDraft>(() =>
    safeStorageGet<SignatureDraft>(STORAGE_KEY, SAMPLE_DRAFT)
  );
  const [uploadError, setUploadError] = useState<string>('');
  const [copiedRich, setCopiedRich] = useState(false);
  const [copiedHtml, setCopiedHtml] = useState(false);

  useEffect(() => {
    safeStorageSet(STORAGE_KEY, draft);
  }, [draft]);

  const updateField = <K extends keyof SignatureDraft>(key: K, value: SignatureDraft[K]) => {
    setDraft((prev) => ({...prev, [key]: value}));
  };

  const handleAvatarUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    setUploadError('');
    const file = e.target.files?.[0];
    if (!file) return;

    const sizeErr = validateFileSize(file);
    if (sizeErr) {
      setUploadError(sizeErr);
      e.target.value = '';
      return;
    }

    if (!file.type.startsWith('image/')) {
      setUploadError('Please select a PNG, JPG, GIF, or WebP image file.');
      e.target.value = '';
      return;
    }

    const reader = new FileReader();
    reader.onload = () => {
      const result = typeof reader.result === 'string' ? reader.result : '';
      if (result) {
        updateField('avatarDataUrl', result);
      }
    };
    reader.onerror = () => setUploadError('Unable to read the selected image.');
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const safeHtml = useMemo(() => buildSafeSignatureHtml(draft), [draft]);

  const plainTextFallback = useMemo(() => {
    const lines = [
      draft.fullName.trim() || 'Your Name',
      [draft.jobTitle.trim(), draft.company.trim()].filter(Boolean).join(' · '),
      draft.email.trim(),
      draft.phone.trim(),
      draft.website.trim(),
      draft.location.trim(),
    ].filter(Boolean);
    return lines.join('\n');
  }, [draft]);

  const handleCopyRichSignature = async () => {
    try {
      if (typeof ClipboardItem !== 'undefined' && navigator.clipboard?.write) {
        const htmlBlob = new Blob([safeHtml], {type: 'text/html'});
        const textBlob = new Blob([plainTextFallback], {type: 'text/plain'});
        await navigator.clipboard.write([
          new ClipboardItem({
            'text/html': htmlBlob,
            'text/plain': textBlob,
          }),
        ]);
      } else {
        await navigator.clipboard.writeText(safeHtml);
      }
      setCopiedRich(true);
      setTimeout(() => setCopiedRich(false), 2200);
      onActionSuccess(
        'Rich email signature copied — paste directly into Gmail, Outlook, or Apple Mail.',
        'I created a clean email signature in seconds using Spark Office.'
      );
    } catch {
      await navigator.clipboard.writeText(plainTextFallback);
      setCopiedRich(true);
      setTimeout(() => setCopiedRich(false), 2200);
      onActionSuccess('Signature text copied to clipboard.');
    }
  };

  const handleCopyRawHtml = async () => {
    await navigator.clipboard.writeText(safeHtml);
    setCopiedHtml(true);
    setTimeout(() => setCopiedHtml(false), 2200);
    onActionSuccess(
      'Raw HTML signature code copied to clipboard.',
      'I built a responsive HTML email signature with Spark Office.'
    );
  };

  const accent = sanitizeHexColor(draft.accentColor, '#0284C7');
  const safeWebsiteHref = sanitizeUrl(draft.website);
  const safeAvatar = sanitizeUrl(draft.avatarDataUrl, true);
  const socialLinks = [
    {label: 'LinkedIn', href: sanitizeUrl(draft.linkedin)},
    {label: 'X / Twitter', href: sanitizeUrl(draft.twitter)},
    {label: 'GitHub', href: sanitizeUrl(draft.github)},
    {label: 'Instagram', href: sanitizeUrl(draft.instagram)},
  ].filter((item) => Boolean(item.href));

  return (
    <div className="space-y-6">
      {/* Tool Header & Actions */}
      <div className="flex flex-col gap-4 border-b border-[#E2E8F0] pb-5 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
        <div>
          <h2 className="text-2xl font-bold tracking-tight text-[#0F172A] dark:text-[#F8FAFC]">
            Pro Email Signature Generator
          </h2>
          <p className="mt-1 text-base text-slate-600 dark:text-slate-300">
            Design a clean, Gmail- and Outlook-ready signature with live preview and instant rich copy.
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

      {/* Main 2-column Editor & Preview */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Form Controls */}
        <div className="space-y-5 lg:col-span-6">
          {/* Template Selector */}
          <div>
            <span className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Template Style</span>
            <div className="mt-2 grid grid-cols-3 gap-2" role="radiogroup" aria-label="Signature Template">
              {(
                [
                  {id: 'classic', label: 'Classic'},
                  {id: 'modern', label: 'Modern Card'},
                  {id: 'minimal', label: 'Minimal'},
                ] as const
              ).map((tpl) => (
                <button
                  key={tpl.id}
                  type="button"
                  role="radio"
                  aria-checked={draft.template === tpl.id}
                  onClick={() => updateField('template', tpl.id)}
                  className={`min-h-[44px] rounded-lg border px-3 py-2 text-base font-medium transition ${
                    draft.template === tpl.id
                      ? 'border-[#0284C7] bg-[#0284C7]/10 text-[#0284C7] dark:border-sky-400 dark:bg-sky-950/60 dark:text-sky-300'
                      : 'border-[#E2E8F0] bg-white text-slate-700 hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-slate-300 dark:hover:bg-slate-700'
                  }`}
                >
                  {tpl.label}
                </button>
              ))}
            </div>
          </div>

          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
            <div>
              <label htmlFor="sig-name" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Full Name
              </label>
              <input
                id="sig-name"
                type="text"
                value={draft.fullName}
                onChange={(e) => updateField('fullName', e.target.value)}
                placeholder="Maya Lin"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
            </div>

            <div>
              <label htmlFor="sig-title" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Job Title
              </label>
              <input
                id="sig-title"
                type="text"
                value={draft.jobTitle}
                onChange={(e) => updateField('jobTitle', e.target.value)}
                placeholder="VP of Partnerships"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
            </div>

            <div>
              <label htmlFor="sig-company" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Company
              </label>
              <input
                id="sig-company"
                type="text"
                value={draft.company}
                onChange={(e) => updateField('company', e.target.value)}
                placeholder="Northstar Logistics"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
            </div>

            <div>
              <label htmlFor="sig-email" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Email Address
              </label>
              <input
                id="sig-email"
                type="email"
                value={draft.email}
                onChange={(e) => updateField('email', e.target.value)}
                placeholder="maya@company.com"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
            </div>

            <div>
              <label htmlFor="sig-phone" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Phone Number
              </label>
              <input
                id="sig-phone"
                type="tel"
                value={draft.phone}
                onChange={(e) => updateField('phone', e.target.value)}
                placeholder="+1 (415) 890-4421"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
            </div>

            <div>
              <label htmlFor="sig-website" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Website
              </label>
              <input
                id="sig-website"
                type="url"
                value={draft.website}
                onChange={(e) => updateField('website', e.target.value)}
                placeholder="https://company.com"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
            </div>

            <div className="sm:col-span-2">
              <label htmlFor="sig-location" className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Office Location
              </label>
              <input
                id="sig-location"
                type="text"
                value={draft.location}
                onChange={(e) => updateField('location', e.target.value)}
                placeholder="San Francisco, CA"
                className="mt-1.5 min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
            </div>
          </div>

          {/* Social Links */}
          <div className="border-t border-[#E2E8F0] pt-4 dark:border-slate-800">
            <h3 className="text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Social Links (Optional)</h3>
            <div className="mt-3 grid grid-cols-1 gap-3 sm:grid-cols-2">
              <input
                type="url"
                aria-label="LinkedIn URL"
                value={draft.linkedin}
                onChange={(e) => updateField('linkedin', e.target.value)}
                placeholder="LinkedIn URL"
                className="min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
              <input
                type="url"
                aria-label="X or Twitter URL"
                value={draft.twitter}
                onChange={(e) => updateField('twitter', e.target.value)}
                placeholder="X / Twitter URL"
                className="min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
              <input
                type="url"
                aria-label="GitHub URL"
                value={draft.github}
                onChange={(e) => updateField('github', e.target.value)}
                placeholder="GitHub URL"
                className="min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
              <input
                type="url"
                aria-label="Instagram URL"
                value={draft.instagram}
                onChange={(e) => updateField('instagram', e.target.value)}
                placeholder="Instagram URL"
                className="min-h-[44px] w-full rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-base text-[#0F172A] placeholder:text-slate-400 dark:border-slate-700 dark:bg-[#0B1120] dark:text-[#F8FAFC]"
              />
            </div>
          </div>

          {/* Accent Color & Photo/Logo */}
          <div className="flex flex-col gap-4 border-t border-[#E2E8F0] pt-4 sm:flex-row sm:items-center sm:justify-between dark:border-slate-800">
            <div>
              <span className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">Brand Accent</span>
              <div className="mt-2 flex flex-wrap items-center gap-2">
                {COLOR_PRESETS.map((hex) => (
                  <button
                    key={hex}
                    type="button"
                    aria-label={`Select accent color ${hex}`}
                    onClick={() => updateField('accentColor', hex)}
                    style={{backgroundColor: hex}}
                    className={`h-9 w-9 rounded-full border-2 transition ${
                      accent.toUpperCase() === hex.toUpperCase()
                        ? 'scale-110 border-[#0F172A] dark:border-white'
                        : 'border-transparent'
                    }`}
                  />
                ))}
                <input
                  type="color"
                  aria-label="Custom accent color"
                  value={accent}
                  onChange={(e) => updateField('accentColor', e.target.value)}
                  className="h-9 w-11 cursor-pointer rounded border border-[#E2E8F0] bg-transparent p-0.5 dark:border-slate-700"
                />
              </div>
            </div>

            <div>
              <span className="block text-sm font-semibold text-[#0F172A] dark:text-[#F8FAFC]">
                Headshot / Logo
              </span>
              <div className="mt-2 flex items-center gap-2">
                <label className="inline-flex min-h-[44px] cursor-pointer items-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-3.5 py-2 text-sm font-medium text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700">
                  <ImagePlus className="h-4 w-4 text-[#0284C7] dark:text-sky-400" aria-hidden="true" />
                  <span>{safeAvatar ? 'Change Image' : 'Upload Image'}</span>
                  <input type="file" accept="image/*" onChange={handleAvatarUpload} className="sr-only" />
                </label>
                {safeAvatar && (
                  <button
                    type="button"
                    onClick={() => updateField('avatarDataUrl', '')}
                    aria-label="Remove uploaded image"
                    className="inline-flex min-h-[44px] min-w-[44px] items-center justify-center rounded-lg border border-[#E2E8F0] text-red-600 transition hover:bg-red-50 dark:border-slate-700 dark:text-red-400 dark:hover:bg-red-950/40"
                  >
                    <Trash2 className="h-4 w-4" aria-hidden="true" />
                  </button>
                )}
              </div>
            </div>
          </div>

          {uploadError && (
            <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
              {uploadError}
            </p>
          )}
        </div>

        {/* Live Visual Preview + Copy Actions */}
        <div className="flex flex-col justify-between space-y-5 lg:col-span-6">
          <div>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-semibold text-slate-600 dark:text-slate-300">
                Live Inbox Preview (Light Email Canvas)
              </h3>
              <span className="text-xs font-medium text-slate-500 dark:text-slate-400">Auto-saved locally</span>
            </div>

            {/* Simulated Email Window (always crisp white email canvas so user sees true Gmail/Outlook look) */}
            <div className="mt-2.5 overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white p-6 text-[#0F172A] shadow-xs dark:border-slate-700">
              <div className="mb-5 border-b border-slate-100 pb-4 text-sm text-slate-500">
                <p>
                  <span className="font-medium text-slate-700">Subject:</span> Partnership Follow-up &amp; Next Steps
                </p>
                <p className="mt-2 text-slate-600">Looking forward to our call on Thursday. Best regards,</p>
              </div>

              {draft.template === 'modern' ? (
                <div
                  className="max-w-[540px] overflow-hidden rounded-xl border border-[#E2E8F0]"
                  style={{fontFamily: 'Arial, Helvetica, sans-serif'}}
                >
                  <div
                    className="flex items-center gap-4 bg-[#F8FAFC] px-5 py-4"
                    style={{borderBottom: `2px solid ${accent}`}}
                  >
                    {safeAvatar && (
                      <img
                        src={safeAvatar}
                        alt={draft.fullName || 'Avatar'}
                        className="h-16 w-16 shrink-0 rounded-xl border border-[#E2E8F0] object-cover"
                      />
                    )}
                    <div>
                      <div className="text-lg font-bold text-[#0F172A] leading-tight">
                        {draft.fullName.trim() || 'Your Name'}
                      </div>
                      {(draft.jobTitle.trim() || draft.company.trim()) && (
                        <div className="mt-0.5 text-sm font-semibold" style={{color: accent}}>
                          {[draft.jobTitle.trim(), draft.company.trim()].filter(Boolean).join(' · ')}
                        </div>
                      )}
                    </div>
                  </div>
                  <div className="bg-white px-5 py-3.5 text-sm text-slate-700">
                    <div className="flex flex-wrap items-center gap-x-3 gap-y-1">
                      {draft.email.trim() && <span>{draft.email.trim()}</span>}
                      {draft.phone.trim() && <span>{draft.phone.trim()}</span>}
                      {safeWebsiteHref && (
                        <span style={{color: accent}}>
                          {draft.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                        </span>
                      )}
                      {draft.location.trim() && <span className="text-slate-500">{draft.location.trim()}</span>}
                    </div>
                    {socialLinks.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                        {socialLinks.map((s) => (
                          <span key={s.label} style={{color: accent}}>
                            {s.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : draft.template === 'minimal' ? (
                <div className="flex max-w-[520px] items-start gap-4" style={{fontFamily: 'Arial, Helvetica, sans-serif'}}>
                  {safeAvatar && (
                    <img
                      src={safeAvatar}
                      alt={draft.fullName || 'Avatar'}
                      className="h-16 w-16 shrink-0 rounded-xl border border-[#E2E8F0] object-cover"
                    />
                  )}
                  <div>
                    <div className="text-lg font-bold text-[#0F172A] leading-tight">
                      {draft.fullName.trim() || 'Your Name'}
                    </div>
                    {(draft.jobTitle.trim() || draft.company.trim()) && (
                      <div className="mt-0.5 text-sm text-slate-600">
                        {[draft.jobTitle.trim(), draft.company.trim()].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    <div className="mt-2 flex flex-wrap items-center gap-x-2.5 gap-y-1 text-sm text-slate-700">
                      {draft.email.trim() && <span>{draft.email.trim()}</span>}
                      {draft.phone.trim() && <span>· {draft.phone.trim()}</span>}
                      {safeWebsiteHref && (
                        <span style={{color: accent}}>
                          · {draft.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                        </span>
                      )}
                      {draft.location.trim() && <span className="text-slate-500">· {draft.location.trim()}</span>}
                    </div>
                    {socialLinks.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                        {socialLinks.map((s) => (
                          <span key={s.label} style={{color: accent}}>
                            {s.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              ) : (
                <div className="flex max-w-[520px] items-start gap-4" style={{fontFamily: 'Arial, Helvetica, sans-serif'}}>
                  {safeAvatar && (
                    <img
                      src={safeAvatar}
                      alt={draft.fullName || 'Avatar'}
                      className="h-[72px] w-[72px] shrink-0 rounded-xl border border-[#E2E8F0] object-cover"
                    />
                  )}
                  <div className="pl-3.5" style={{borderLeft: `3px solid ${accent}`}}>
                    <div className="text-lg font-bold text-[#0F172A] leading-tight">
                      {draft.fullName.trim() || 'Your Name'}
                    </div>
                    {(draft.jobTitle.trim() || draft.company.trim()) && (
                      <div className="mt-0.5 text-sm font-semibold" style={{color: accent}}>
                        {[draft.jobTitle.trim(), draft.company.trim()].filter(Boolean).join(' · ')}
                      </div>
                    )}
                    <div className="mt-2 space-y-0.5 text-sm text-slate-700">
                      {draft.email.trim() && <div>{draft.email.trim()}</div>}
                      {draft.phone.trim() && <div>{draft.phone.trim()}</div>}
                      {safeWebsiteHref && (
                        <div style={{color: accent}}>
                          {draft.website.replace(/^https?:\/\//i, '').replace(/\/$/, '')}
                        </div>
                      )}
                      {draft.location.trim() && <div className="text-slate-500">{draft.location.trim()}</div>}
                    </div>
                    {socialLinks.length > 0 && (
                      <div className="mt-2 flex flex-wrap gap-3 text-xs font-semibold">
                        {socialLinks.map((s) => (
                          <span key={s.label} style={{color: accent}}>
                            {s.label}
                          </span>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Primary Copy Actions */}
          <div className="rounded-xl border border-[#E2E8F0] bg-[#F8FAFC] p-4 dark:border-slate-800 dark:bg-[#0B1120]">
            <div className="flex flex-col gap-3 sm:flex-row">
              <button
                type="button"
                onClick={handleCopyRichSignature}
                className="inline-flex min-h-[44px] flex-1 items-center justify-center gap-2 rounded-lg bg-[#0284C7] px-5 py-2.5 text-base font-semibold text-white transition hover:bg-[#0369A1]"
              >
                {copiedRich ? (
                  <>
                    <Check className="h-5 w-5" aria-hidden="true" />
                    Copied for Gmail / Outlook
                  </>
                ) : (
                  <>
                    <Copy className="h-5 w-5" aria-hidden="true" />
                    Copy Rich Signature
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleCopyRawHtml}
                className="inline-flex min-h-[44px] items-center justify-center gap-2 rounded-lg border border-[#E2E8F0] bg-white px-4 py-2.5 text-base font-medium text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
              >
                {copiedHtml ? (
                  <>
                    <Check className="h-4 w-4 text-emerald-600" aria-hidden="true" />
                    HTML Copied
                  </>
                ) : (
                  <>
                    <Code2 className="h-4 w-4" aria-hidden="true" />
                    Copy HTML Code
                  </>
                )}
              </button>
            </div>
            <p className="mt-2.5 text-sm text-slate-600 dark:text-slate-400">
              In Gmail or Outlook Settings → Signature, press <kbd className="rounded border px-1.5 py-0.5 text-xs">Ctrl+V</kbd> /{' '}
              <kbd className="rounded border px-1.5 py-0.5 text-xs">⌘V</kbd> after clicking &ldquo;Copy Rich Signature&rdquo;.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
