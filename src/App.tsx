/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */
import React, {useRef, useState} from 'react';
import {
  FileDiff,
  FileSpreadsheet,
  Link2,
  MailCheck,
  ReceiptText,
  WifiOff,
} from 'lucide-react';
import {ErrorBoundary} from './components/ErrorBoundary';
import {Footer} from './components/Footer';
import {Header} from './components/Header';
import {ShareBanner, ShareFeedback} from './components/ShareBanner';
import {useAutoTheme} from './hooks/useAutoTheme';
import {useOnlineStatus} from './hooks/useOnlineStatus';
import {DiffCheckerTool} from './tools/DiffCheckerTool';
import {EmailSignatureTool} from './tools/EmailSignatureTool';
import {ExtractorTool} from './tools/ExtractorTool';
import {QuotationCardTool} from './tools/QuotationCardTool';
import {UtmBuilderTool} from './tools/UtmBuilderTool';
import {safeStorageGet, safeStorageSet} from './utils/security';

// Hidden 2028 Pro Switch for future feature gating
const ENABLE_PRO_LOCK = false;

type ToolId = 'signature' | 'diff' | 'extractor' | 'utm' | 'quotation';

const ACTIVE_TOOL_KEY = 'spark_office_active_tool_v1';

const TOOLS: Array<{
  id: ToolId;
  label: string;
  shortLabel: string;
  icon: React.ComponentType<{className?: string; 'aria-hidden'?: boolean}>;
  proOnly?: boolean;
}> = [
  {id: 'signature', label: 'Email Signature', shortLabel: 'Signature', icon: MailCheck},
  {id: 'diff', label: 'Contract Diff', shortLabel: 'Diff Checker', icon: FileDiff},
  {id: 'extractor', label: 'Email & Phone Extractor', shortLabel: 'Extractor', icon: FileSpreadsheet},
  {id: 'utm', label: 'UTM Link Builder', shortLabel: 'UTM Builder', icon: Link2},
  {id: 'quotation', label: 'Quotation & Card', shortLabel: 'Quote & Card', icon: ReceiptText},
];

export default function App() {
  const {resolvedDark, cycleTheme} = useAutoTheme();
  const isOnline = useOnlineStatus();
  const [activeTool, setActiveTool] = useState<ToolId>(() =>
    safeStorageGet<ToolId>(ACTIVE_TOOL_KEY, 'signature')
  );
  const [shareFeedback, setShareFeedback] = useState<ShareFeedback | null>(null);
  const [resetKey, setResetKey] = useState(0);
  const tabRefs = useRef<Array<HTMLButtonElement | null>>([]);

  const handleSelectTool = (id: ToolId) => {
    setActiveTool(id);
    safeStorageSet(ACTIVE_TOOL_KEY, id);
    setShareFeedback(null);
  };

  const handleActionSuccess = (message: string, shareText?: string) => {
    setShareFeedback({
      id: Date.now(),
      message,
      shareText,
    });
  };

  const handleTabKeyDown = (e: React.KeyboardEvent<HTMLButtonElement>, index: number) => {
    let nextIndex = index;
    if (e.key === 'ArrowRight') {
      nextIndex = (index + 1) % TOOLS.length;
    } else if (e.key === 'ArrowLeft') {
      nextIndex = (index - 1 + TOOLS.length) % TOOLS.length;
    } else if (e.key === 'Home') {
      nextIndex = 0;
    } else if (e.key === 'End') {
      nextIndex = TOOLS.length - 1;
    } else {
      return;
    }
    e.preventDefault();
    const targetTool = TOOLS[nextIndex];
    handleSelectTool(targetTool.id);
    tabRefs.current[nextIndex]?.focus();
  };

  const activeToolDef = TOOLS.find((t) => t.id === activeTool) || TOOLS[0];
  const isLocked = ENABLE_PRO_LOCK && Boolean(activeToolDef.proOnly);

  return (
    <div className="flex min-h-screen flex-col bg-[#F8FAFC] text-[#0F172A] dark:bg-[#0B1120] dark:text-[#F8FAFC]">
      <a
        href="#main-workspace"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:rounded-lg focus:bg-[#0284C7] focus:px-4 focus:py-2 focus:text-white"
      >
        Skip to workspace
      </a>

      <Header resolvedDark={resolvedDark} onToggleTheme={cycleTheme} />

      <main id="main-workspace" className="mx-auto w-full max-w-[1280px] flex-1 px-4 py-6 sm:px-6 lg:px-8">
        {!isOnline && (
          <div
            role="status"
            className="no-print mb-5 flex items-center gap-2.5 rounded-xl border border-amber-200 bg-amber-50 px-4 py-3 text-sm font-medium text-amber-900 dark:border-amber-900/60 dark:bg-amber-950/40 dark:text-amber-200"
          >
            <WifiOff className="h-4 w-4 shrink-0" aria-hidden="true" />
            <span>Offline Mode active — all 5 tools and local drafts continue working in your browser.</span>
          </div>
        )}

        {/* 5-Tool Workspace Navigation Tabs */}
        <nav aria-label="Business Productivity Tools" className="no-print mb-6">
          <div
            role="tablist"
            aria-label="Spark Office Tools"
            className="flex items-center gap-2 overflow-x-auto rounded-xl border border-[#E2E8F0] bg-white p-1.5 shadow-2xs dark:border-slate-800 dark:bg-[#131C31]"
          >
            {TOOLS.map((tool, index) => {
              const Icon = tool.icon;
              const isSelected = activeTool === tool.id;
              return (
                <button
                  key={tool.id}
                  ref={(el) => {
                    tabRefs.current[index] = el;
                  }}
                  id={`tab-${tool.id}`}
                  type="button"
                  role="tab"
                  aria-selected={isSelected}
                  aria-controls={`panel-${tool.id}`}
                  tabIndex={isSelected ? 0 : -1}
                  onClick={() => handleSelectTool(tool.id)}
                  onKeyDown={(e) => handleTabKeyDown(e, index)}
                  className={`inline-flex min-h-[44px] shrink-0 items-center gap-2 rounded-lg px-4 py-2 text-base font-semibold whitespace-nowrap transition ${
                    isSelected
                      ? 'bg-[#0284C7] text-white shadow-xs'
                      : 'text-slate-700 hover:bg-slate-100 hover:text-[#0F172A] dark:text-slate-300 dark:hover:bg-slate-800 dark:hover:text-white'
                  }`}
                >
                  <Icon className="h-4 w-4 shrink-0" aria-hidden={true} />
                  <span className="hidden md:inline">{tool.label}</span>
                  <span className="md:hidden">{tool.shortLabel}</span>
                </button>
              );
            })}
          </div>
        </nav>

        {/* Active Tool Card */}
        <ErrorBoundary
          key={resetKey}
          onResetApp={() => {
            setShareFeedback(null);
            setResetKey((k) => k + 1);
          }}
        >
          <section
            id={`panel-${activeTool}`}
            role="tabpanel"
            aria-labelledby={`tab-${activeTool}`}
            className="rounded-2xl border border-[#E2E8F0] bg-white p-5 shadow-2xs sm:p-7 dark:border-slate-800 dark:bg-[#131C31]"
          >
            {isLocked ? (
              <div className="py-12 text-center">
                <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">Spark Office Pro Feature</h2>
                <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                  This module is currently gated by ENABLE_PRO_LOCK.
                </p>
              </div>
            ) : (
              <>
                {activeTool === 'signature' && <EmailSignatureTool onActionSuccess={handleActionSuccess} />}
                {activeTool === 'diff' && <DiffCheckerTool onActionSuccess={handleActionSuccess} />}
                {activeTool === 'extractor' && <ExtractorTool onActionSuccess={handleActionSuccess} />}
                {activeTool === 'utm' && <UtmBuilderTool onActionSuccess={handleActionSuccess} />}
                {activeTool === 'quotation' && <QuotationCardTool onActionSuccess={handleActionSuccess} />}
              </>
            )}

            <ShareBanner feedback={shareFeedback} onDismiss={() => setShareFeedback(null)} />
          </section>
        </ErrorBoundary>
      </main>

      <Footer />
    </div>
  );
}
