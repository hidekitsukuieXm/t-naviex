import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestStepList } from '../test-step-list';
import type { TestStep } from '@/types/test-step';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TestStepList', () => {
  const mockSteps: TestStep[] = [
    {
      id: 'step-1',
      testCaseId: 'tc-1',
      stepNo: 1,
      actionMd: 'First action',
      expectedMd: 'First expected result',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'step-2',
      testCaseId: 'tc-1',
      stepNo: 2,
      actionMd: 'Second action',
      expectedMd: 'Second expected result',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render empty state when no steps', () => {
    render(<TestStepList testSpecId="spec-1" testCaseId="tc-1" initialSteps={[]} />);

    expect(screen.getByText('テスト手順がまだありません。')).toBeDefined();
    expect(
      screen.getByText('「手順を追加」ボタンから新しい手順を追加してください。')
    ).toBeDefined();
  });

  it('should render steps count', () => {
    render(<TestStepList testSpecId="spec-1" testCaseId="tc-1" initialSteps={mockSteps} />);

    expect(screen.getByText('(2件)')).toBeDefined();
  });

  it('should render step items', () => {
    render(<TestStepList testSpecId="spec-1" testCaseId="tc-1" initialSteps={mockSteps} />);

    expect(screen.getByText('First action')).toBeDefined();
    expect(screen.getByText('Second action')).toBeDefined();
  });

  it('should open add dialog when add button clicked', async () => {
    render(<TestStepList testSpecId="spec-1" testCaseId="tc-1" initialSteps={[]} />);

    const addButton = screen.getByRole('button', { name: /手順を追加/ });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('新規テスト手順')).toBeDefined();
    });
  });

  it('should disable add button when disabled prop is true', () => {
    render(
      <TestStepList testSpecId="spec-1" testCaseId="tc-1" initialSteps={[]} disabled={true} />
    );

    const addButton = screen.getByRole('button', { name: /手順を追加/ });
    expect(addButton.hasAttribute('disabled')).toBe(true);
  });

  it('should show drag hint when steps exist', () => {
    render(<TestStepList testSpecId="spec-1" testCaseId="tc-1" initialSteps={mockSteps} />);

    expect(screen.getByText('手順をドラッグして並び替えできます')).toBeDefined();
  });

  it('should not show drag hint when disabled', () => {
    render(
      <TestStepList
        testSpecId="spec-1"
        testCaseId="tc-1"
        initialSteps={mockSteps}
        disabled={true}
      />
    );

    expect(screen.queryByText('手順をドラッグして並び替えできます')).toBeNull();
  });

  it('should call API when adding a step', async () => {
    mockFetch
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ id: 'new-step', stepNo: 1 }),
      })
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({
          steps: [
            {
              id: 'new-step',
              testCaseId: 'tc-1',
              stepNo: 1,
              actionMd: 'New action',
              expectedMd: 'New expected',
              createdAt: '2024-01-01T00:00:00.000Z',
              updatedAt: '2024-01-01T00:00:00.000Z',
            },
          ],
        }),
      });

    render(<TestStepList testSpecId="spec-1" testCaseId="tc-1" initialSteps={[]} />);

    const addButton = screen.getByRole('button', { name: /手順を追加/ });
    fireEvent.click(addButton);

    await waitFor(() => {
      expect(screen.getByText('新規テスト手順')).toBeDefined();
    });

    const actionInput = screen.getByPlaceholderText(/テストの操作手順を入力/);
    fireEvent.change(actionInput, { target: { value: 'New action' } });

    const submitButton = screen.getByRole('button', { name: '追加' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test-specs/spec-1/cases/tc-1/steps',
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify({
            actionMd: 'New action',
            expectedMd: null,
          }),
        })
      );
    });
  });

  it('should show header with icon and title', () => {
    render(<TestStepList testSpecId="spec-1" testCaseId="tc-1" initialSteps={[]} />);

    expect(screen.getByText('テスト手順')).toBeDefined();
  });
});
