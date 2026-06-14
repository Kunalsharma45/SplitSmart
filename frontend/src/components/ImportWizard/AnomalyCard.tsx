import React from 'react';
import { AnomalyCardProps } from '../../types/ai.types';
import { useAIExplanation } from '../../hooks/useAIExplanation';
import AIExplanationPanel from './AIExplanationPanel';

export default function AnomalyCard({
  anomaly,
  rowNumber,
  rawRowData,
  groupId,
  groupMembers,
  onActionApplied,
  onSkip,
  duplicateRowData,
}: AnomalyCardProps) {
  const anomalyId = `row_${rowNumber}_${anomaly.code}`;
  const {
    explanations,
    loadingIds,
    errorIds,
    rateLimitedIds,
    explainAnomaly,
  } = useAIExplanation(groupId);

  const isLoading = loadingIds.has(anomalyId);
  const isError = errorIds.has(anomalyId);
  const rateLimitMsg = rateLimitedIds[anomalyId];
  const explanation = explanations[anomalyId];

  const handleExplainClick = () => {
    // Determine exchange rate from rowData if applicable
    let exchangeRate: number | undefined = undefined;
    if (rawRowData.exchange_rate) {
      exchangeRate = parseFloat(rawRowData.exchange_rate);
    }
    explainAnomaly(anomalyId, anomaly.code, rawRowData, duplicateRowData, exchangeRate);
  };

  const handlePrimaryAction = () => {
    if (onActionApplied && explanation) {
      onActionApplied(explanation.recommended_action);
    }
  };

  const handleRejectAction = () => {
    if (onActionApplied) {
      onActionApplied('REJECT');
    }
  };

  const handleSkipAction = () => {
    if (onSkip) {
      onSkip();
    }
  };

  // Border/Icon styles based on severity level
  const borderClass = anomaly.level === 'error' ? 'border-red-200 bg-red-50/50' : 'border-amber-200 bg-amber-50/30';
  const headerClass = anomaly.level === 'error' ? 'text-red-700' : 'text-amber-700';
  const icon = anomaly.level === 'error' ? '🔴' : '🟡';

  return (
    <div className={`rounded-3xl border p-4 shadow-sm transition ${borderClass}`}>
      <div className="flex items-center justify-between gap-4">
        <div className={`text-sm font-bold flex items-center gap-2 ${headerClass}`}>
          <span>{icon} Row #{rowNumber} — {anomaly.code.replace('_', ' ')}</span>
        </div>
        <span className="text-xs text-slate-500 font-mono">Status: Flags Detected</span>
      </div>

      {/* Raw Data Preview */}
      <div className="mt-2 text-xs text-slate-600 bg-white/50 p-2.5 rounded-xl border border-slate-100/50 space-y-1">
        <p className="font-semibold text-slate-700">{anomaly.message}</p>
        <div className="grid grid-cols-2 gap-1 mt-1 text-slate-500">
          <div><span className="font-semibold">Payer:</span> {rawRowData.paid_by || rawRowData.paid_by_id || '—'}</div>
          <div><span className="font-semibold">Amount:</span> {rawRowData.amount || '—'} {rawRowData.currency || 'INR'}</div>
          <div><span className="font-semibold">Date:</span> {rawRowData.date || '—'}</div>
          <div><span className="font-semibold">Split:</span> {rawRowData.split_type || 'EQUAL'}</div>
        </div>
      </div>

      {/* Trigger or Panel */}
      {!explanation && !isLoading && !rateLimitMsg ? (
        <div className="mt-3">
          <button
            onClick={handleExplainClick}
            className="inline-flex items-center gap-1.5 rounded-xl bg-white hover:bg-slate-50 transition px-3.5 py-2 text-xs font-semibold text-blue-600 border border-blue-200 shadow-sm"
          >
            <span>✨</span> Explain with AI
          </button>
          {isError && (
            <div className="mt-2 text-xs text-red-600">
              Explanation unavailable. Please review manually.
            </div>
          )}
        </div>
      ) : (
        <AIExplanationPanel
          explanation={explanation?.explanation || 'Explanation unavailable.'}
          recommendedAction={explanation?.recommended_action || 'MANUAL_REVIEW'}
          actionLabel={explanation?.action_label || 'Review Manually'}
          confidence={explanation?.confidence || 'LOW'}
          aiGenerated={explanation?.ai_generated ?? false}
          isLoading={isLoading}
          rateLimitMessage={rateLimitMsg}
          onPrimaryAction={handlePrimaryAction}
          onRejectAction={handleRejectAction}
          onSkipAction={handleSkipAction}
        />
      )}
    </div>
  );
}
