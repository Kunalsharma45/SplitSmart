export interface AIExplanationResponse {
  explanation: string;
  recommended_action: string;
  action_label: string;
  confidence: 'HIGH' | 'MEDIUM' | 'LOW';
  ai_generated: boolean;
}

export interface AnomalyCardProps {
  anomaly: {
    level: 'error' | 'warning' | 'info';
    code: string;
    message: string;
  };
  rowNumber: number;
  rawRowData: Record<string, string>;
  groupId: string;
  groupMembers: { id: string; username: string }[];
  onActionApplied?: (action: string) => void;
  onSkip?: () => void;
  duplicateRowData?: Record<string, string>;
}
