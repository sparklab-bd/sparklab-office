import React from 'react';
import {AlertTriangle, RotateCcw} from 'lucide-react';

interface ErrorBoundaryProps {
  children: React.ReactNode;
  onResetApp?: () => void;
}

interface ErrorBoundaryState {
  hasError: boolean;
  errorMessage: string;
}

export class ErrorBoundary extends React.Component<ErrorBoundaryProps, ErrorBoundaryState> {
  constructor(props: ErrorBoundaryProps) {
    super(props);
    this.state = {
      hasError: false,
      errorMessage: '',
    };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return {
      hasError: true,
      errorMessage: error?.message || 'An unexpected processing error occurred.',
    };
  }

  handleAutoReset = () => {
    try {
      const keysToRemove: string[] = [];
      for (let i = 0; i < window.localStorage.length; i++) {
        const key = window.localStorage.key(i);
        if (key && key.startsWith('spark_office_')) {
          keysToRemove.push(key);
        }
      }
      keysToRemove.forEach((k) => window.localStorage.removeItem(k));
    } catch {
      // Ignore storage access failures
    }
    this.props.onResetApp?.();
    this.setState({hasError: false, errorMessage: ''});
  };

  handleSoftRetry = () => {
    this.setState({hasError: false, errorMessage: ''});
  };

  render() {
    if (this.state.hasError) {
      return (
        <div
          role="alert"
          className="mx-auto my-12 max-w-xl rounded-xl border border-red-200 bg-white p-8 shadow-sm dark:border-red-900/60 dark:bg-[#131C31]"
        >
          <div className="flex items-start gap-4">
            <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-red-50 text-red-600 dark:bg-red-950/60 dark:text-red-400">
              <AlertTriangle className="h-6 w-6" aria-hidden="true" />
            </div>
            <div className="min-w-0 flex-1">
              <h2 className="text-xl font-bold text-[#0F172A] dark:text-[#F8FAFC]">
                Something went wrong in the workspace
              </h2>
              <p className="mt-2 text-base text-slate-600 dark:text-slate-300">
                Your browser caught an unexpected input error. No data left your device.
              </p>
              <p className="mt-2 rounded-lg bg-slate-50 p-3 font-mono text-sm text-slate-700 dark:bg-[#0B1120] dark:text-slate-300">
                {this.state.errorMessage}
              </p>
              <div className="mt-6 flex flex-wrap gap-3">
                <button
                  type="button"
                  onClick={this.handleAutoReset}
                  className="inline-flex min-h-[44px] items-center gap-2 rounded-lg bg-[#0284C7] px-5 py-2.5 text-base font-semibold text-white transition hover:bg-[#0369A1]"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" />
                  Auto-Reset Workspace
                </button>
                <button
                  type="button"
                  onClick={this.handleSoftRetry}
                  className="inline-flex min-h-[44px] items-center rounded-lg border border-[#E2E8F0] bg-white px-5 py-2.5 text-base font-medium text-[#0F172A] transition hover:bg-slate-50 dark:border-slate-700 dark:bg-slate-800 dark:text-[#F8FAFC] dark:hover:bg-slate-700"
                >
                  Try Again
                </button>
              </div>
            </div>
          </div>
        </div>
      );
    }

    return this.props.children;
  }
}
