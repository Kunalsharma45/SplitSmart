import React from 'react';
import { AIExplanationResponse } from '../../types/ai.types';

interface AIExplanationPanelProps {
  explanation: string;
  recommendedAction: string;
  actionLabel: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  aiGenerated: boolean;
  isLoading: boolean;
  rateLimitMessage?: string | null;
  onPrimaryAction: () => void;
  onRejectAction: () => void;
  onSkipAction: () => void;
}

export default function AIExplanationPanel({
  explanation,
  recommendedAction,
  actionLabel,
  confidence,
  aiGenerated,
  isLoading,
  rateLimitMessage,
  onPrimaryAction,
  onRejectAction,
  onSkipAction,
}: AIExplanationPanelProps) {
  if (isLoading) {
    return (
      <div className="mt-3 flex items-center gap-2 rounded-2xl bg-blue-50/50 p-4 border border-blue-100 shadow-sm animate-pulse">
        <svg className="h-5 w-5 animate-spin text-blue-500" fill="none" viewBox="0 0 24 24">
          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z" />
        </svg>
        <span className="text-sm font-medium text-blue-600">AI is thinking...</span>
      </div>
    );
  }

  if (rateLimitMessage) {
    return (
      <div className="mt-3 rounded-2xl bg-amber-50 p-4 border border-amber-200 shadow-sm text-sm text-amber-800">
        <div className="font-semibold flex items-center gap-1">
          ⚠️ Rate Limit Exceeded
        </div>
        <p className="mt-1">{rateLimitMessage}</p>
      </div>
    );
  }

  // Determine badge colors based on confidence
  const confidenceBadge = () => {
    switch (confidence) {
      case 'HIGH':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-green-50 px-2 py-0.5 text-xs font-semibold text-green-700 border border-green-200">
            🟢 High confidence
          </span>
        );
      case 'MEDIUM':
        return (
          <span className="inline-flex items-center gap-1 rounded bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700 border border-amber-200">
            🟡 Review recommended
          </span>
        );
      case 'LOW':
      default:
        return (
          <span className="inline-flex items-center gap-1 rounded bg-red-50 px-2 py-0.5 text-xs font-semibold text-red-700 border border-red-200">
            🔴 Please verify manually
          </span>
        );
    }
  };

  return (
    <div className="mt-3 space-y-4">
      {/* Explanation Box */}
      <div className="rounded-2xl bg-blue-50/70 p-4 border-l-4 border-blue-500 border border-t-blue-100 border-r-blue-100 border-b-blue-100 shadow-sm">
        <div className="flex items-center justify-between gap-2">
          <div className="text-xs font-bold text-blue-600 uppercase tracking-wide flex items-center gap-1">
            ✨ AI Explanation
          </div>
          {aiGenerated && confidenceBadge()}
        </div>
        <p className="mt-2 text-sm text-slate-800 leading-relaxed font-normal">
          {explanation}
        </p>
        {!aiGenerated && (
          <div className="mt-2 rounded bg-amber-50 p-2 text-xs text-amber-700 border border-amber-200">
            AI explanation unavailable. Please review manually.
          </div>
        )}
      </div>

      {/* Smart Actions Panel */}
      <div className="flex flex-wrap items-center gap-3">
        {recommendedAction !== 'MANUAL_REVIEW' ? (
          <>
            <button
              onClick={onPrimaryAction}
              className="rounded-xl bg-emerald-600 hover:bg-emerald-700 transition px-4 py-2 text-sm font-semibold text-white shadow-sm"
            >
              {actionLabel}
            </button>
            <button
              onClick={onRejectAction}
              className="rounded-xl bg-slate-100 hover:bg-slate-200 transition px-4 py-2 text-sm font-semibold text-slate-700 border border-slate-200"
            >
              Reject Instead
            </button>
          </>
        ) : (
          <span className="text-xs text-slate-500 italic">Please make edits or review this row above.</span>
        )}
        <button
          onClick={onSkipAction}
          className="text-xs text-slate-500 hover:text-slate-800 underline ml-auto transition font-medium"
        >
          Skip for Now
        </button>
      </div>
    </div>
  );
}
