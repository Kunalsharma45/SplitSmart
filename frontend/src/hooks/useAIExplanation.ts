import { useState } from 'react';
import { explainAnomaly } from '../services/aiService';
import { AIExplanationResponse } from '../types/ai.types';

export function useAIExplanation(groupId: string) {
  const [explanations, setExplanations] = useState<Record<string, AIExplanationResponse>>({});
  const [loadingIds, setLoadingIds] = useState<Set<string>>(new Set());
  const [errorIds, setErrorIds] = useState<Set<string>>(new Set());
  const [rateLimitedIds, setRateLimitedIds] = useState<Record<string, string>>({}); // Mapping id -> limit message

  const explain = async (
    anomalyId: string,
    anomalyType: string,
    rawRowData: Record<string, string>,
    duplicateRowData?: Record<string, string>,
    exchangeRate?: number
  ) => {
    // 1. Check if already loading or already fetched
    if (loadingIds.has(anomalyId) || explanations[anomalyId]) {
      return;
    }

    setLoadingIds((prev) => {
      const next = new Set(prev);
      next.add(anomalyId);
      return next;
    });

    setErrorIds((prev) => {
      const next = new Set(prev);
      next.delete(anomalyId);
      return next;
    });

    setRateLimitedIds((prev) => {
      const next = { ...prev };
      delete next[anomalyId];
      return next;
    });

    try {
      const result = await explainAnomaly(
        anomalyType,
        rawRowData,
        groupId,
        duplicateRowData,
        exchangeRate
      );
      setExplanations((prev) => ({
        ...prev,
        [anomalyId]: result,
      }));
    } catch (error: any) {
      if (error?.response?.status === 429) {
        const msg = error?.response?.data?.message || 'Rate limit exceeded. Try again later.';
        setRateLimitedIds((prev) => ({
          ...prev,
          [anomalyId]: msg,
        }));
      } else {
        setErrorIds((prev) => {
          const next = new Set(prev);
          next.add(anomalyId);
          return next;
        });
      }
    } finally {
      setLoadingIds((prev) => {
        const next = new Set(prev);
        next.delete(anomalyId);
        return next;
      });
    }
  };

  return {
    explanations,
    loadingIds,
    errorIds,
    rateLimitedIds,
    explainAnomaly: explain,
  };
}
