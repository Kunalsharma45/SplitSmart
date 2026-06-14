import React from 'react';
import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor, act } from '@testing-library/react';

import '@testing-library/jest-dom';
import AnomalyCard from '../components/ImportWizard/AnomalyCard';
import * as aiService from '../services/aiService';

// Mock the explainAnomaly API service call
vi.mock('../services/aiService', () => ({
  explainAnomaly: vi.fn(),
}));

describe('AnomalyCard component tests', () => {
  const mockAnomaly = {
    level: 'warning' as const,
    code: 'DUPLICATE_ROW',
    message: 'Row appears to be a duplicate.',
  };

  const rawRowData = {
    row_number: '7',
    date: '2024-03-05',
    amount: '850',
    description: 'Dominos dinner',
    paid_by: 'Aisha',
    currency: 'INR',
    split_type: 'EQUAL',
  };

  const groupMembers = [
    { id: '1', username: 'Aisha' },
    { id: '2', username: 'Rohan' },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('Test 1: "Explain with AI" button renders', () => {
    render(
      <AnomalyCard
        anomaly={mockAnomaly}
        rowNumber={7}
        rawRowData={rawRowData}
        groupId="group-uuid"
        groupMembers={groupMembers}
      />
    );

    // Verify "Explain with AI" button exists
    const btn = screen.getByRole('button', { name: /Explain with AI/i });
    expect(btn).toBeInTheDocument();
  });

  it('Test 2: clicking button shows loading state', async () => {
    // Return a delayed response so we can capture loading state
    let resolveMock: any;
    const promise = new Promise<any>((resolve) => {
      resolveMock = resolve;
    });
    vi.mocked(aiService.explainAnomaly).mockReturnValueOnce(promise);

    render(
      <AnomalyCard
        anomaly={mockAnomaly}
        rowNumber={7}
        rawRowData={rawRowData}
        groupId="group-uuid"
        groupMembers={groupMembers}
      />
    );

    const btn = screen.getByRole('button', { name: /Explain with AI/i });
    fireEvent.click(btn);

    // Verify loading spinner / text is shown
    expect(screen.getByText(/AI is thinking.../i)).toBeInTheDocument();
    
    // Cleanup/resolve
    await act(async () => {
      resolveMock({
        explanation: 'Test',
        recommended_action: 'KEEP',
        action_label: 'Keep',
        confidence: 'HIGH',
        ai_generated: true,
      });
      await promise;
    });
  });


  it('Test 3: explanation panel shows after response', async () => {
    vi.mocked(aiService.explainAnomaly).mockResolvedValueOnce({
      explanation: 'This Dominos expense was submitted twice.',
      recommended_action: 'KEEP',
      action_label: 'Keep Row 7, Remove Row 12',
      confidence: 'HIGH',
      ai_generated: true,
    });

    render(
      <AnomalyCard
        anomaly={mockAnomaly}
        rowNumber={7}
        rawRowData={rawRowData}
        groupId="group-uuid"
        groupMembers={groupMembers}
      />
    );

    const btn = screen.getByRole('button', { name: /Explain with AI/i });
    fireEvent.click(btn);

    // Wait for the explanation text to appear
    await waitFor(() => {
      expect(screen.getByText('This Dominos expense was submitted twice.')).toBeInTheDocument();
    });

    // Check confidence badge
    expect(screen.getByText('🟢 High confidence')).toBeInTheDocument();
  });

  it('Test 4: error state shows fallback message', async () => {
    vi.mocked(aiService.explainAnomaly).mockRejectedValueOnce(new Error('Network error'));

    render(
      <AnomalyCard
        anomaly={mockAnomaly}
        rowNumber={7}
        rawRowData={rawRowData}
        groupId="group-uuid"
        groupMembers={groupMembers}
      />
    );

    const btn = screen.getByRole('button', { name: /Explain with AI/i });
    fireEvent.click(btn);

    // Wait for fallback message
    await waitFor(() => {
      expect(screen.getByText(/Explanation unavailable/i)).toBeInTheDocument();
    });
  });

  it('Test 5: button not shown after explanation loaded', async () => {
    vi.mocked(aiService.explainAnomaly).mockResolvedValueOnce({
      explanation: 'This Dominos expense was submitted twice.',
      recommended_action: 'KEEP',
      action_label: 'Keep Row 7, Remove Row 12',
      confidence: 'HIGH',
      ai_generated: true,
    });

    render(
      <AnomalyCard
        anomaly={mockAnomaly}
        rowNumber={7}
        rawRowData={rawRowData}
        groupId="group-uuid"
        groupMembers={groupMembers}
      />
    );

    const btn = screen.getByRole('button', { name: /Explain with AI/i });
    fireEvent.click(btn);

    // Wait for explanation
    await waitFor(() => {
      expect(screen.getByText('This Dominos expense was submitted twice.')).toBeInTheDocument();
    });

    // Verify "Explain with AI" button is gone
    expect(screen.queryByRole('button', { name: /Explain with AI/i })).not.toBeInTheDocument();

    // Verify smart action buttons are shown
    expect(screen.getByRole('button', { name: /Keep Row 7, Remove Row 12/i })).toBeInTheDocument();
    expect(screen.getByRole('button', { name: /Reject Instead/i })).toBeInTheDocument();
  });
});
