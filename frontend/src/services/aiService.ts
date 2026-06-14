import api from '../lib/api';
import { AIExplanationResponse } from '../types/ai.types';

export async function explainAnomaly(
  anomalyType: string,
  rawRowData: Record<string, string>,
  groupId: string,
  duplicateRowData?: Record<string, string>,
  exchangeRate?: number
): Promise<AIExplanationResponse> {
  const response = await api.post('/ai/explain-anomaly/', {
    anomaly_type: anomalyType,
    raw_row_data: rawRowData,
    group_id: groupId,
    duplicate_row_data: duplicateRowData,
    exchange_rate: exchangeRate,
  });

  if (!response.data.success) {
    throw new Error(response.data.message || 'Failed to explain anomaly');
  }
  return response.data.data;
}
