/**
 * バグフォームコンポーネントのテスト
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { BugForm } from '../bug-form';

// Mock fetch
global.fetch = vi.fn();

beforeEach(() => {
  vi.clearAllMocks();

  // Mock members API
  (global.fetch as ReturnType<typeof vi.fn>).mockResolvedValue({
    ok: true,
    json: async () => [
      { user: { id: '1', name: 'User 1' } },
      { user: { id: '2', name: 'User 2' } },
    ],
  });
});

describe('BugForm', () => {
  const mockOnSubmit = vi.fn();
  const mockOnCancel = vi.fn();

  it('should render all form fields', async () => {
    render(<BugForm projectId="1" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    expect(screen.getByLabelText(/タイトル/)).toBeInTheDocument();
    expect(screen.getByLabelText(/種別/)).toBeInTheDocument();
    expect(screen.getByLabelText(/優先度/)).toBeInTheDocument();
    expect(screen.getByLabelText(/重大度/)).toBeInTheDocument();
    expect(screen.getByLabelText(/担当者/)).toBeInTheDocument();
    expect(screen.getByLabelText(/期限/)).toBeInTheDocument();
    expect(screen.getByLabelText(/説明/)).toBeInTheDocument();
    expect(screen.getByLabelText(/再現手順/)).toBeInTheDocument();
    expect(screen.getByLabelText(/期待結果/)).toBeInTheDocument();
    expect(screen.getByLabelText(/実際の結果/)).toBeInTheDocument();
    expect(screen.getByLabelText(/環境/)).toBeInTheDocument();
    expect(screen.getByLabelText(/バージョン/)).toBeInTheDocument();
  });

  it('should show error when title is empty', async () => {
    const user = userEvent.setup();

    render(<BugForm projectId="1" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const submitButton = screen.getByRole('button', { name: /作成/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText(/タイトルは必須です/)).toBeInTheDocument();
    });
    expect(mockOnSubmit).not.toHaveBeenCalled();
  });

  it('should call onSubmit with form data when valid', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockResolvedValue(undefined);

    render(<BugForm projectId="1" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const titleInput = screen.getByLabelText(/タイトル/);
    await user.type(titleInput, 'Test Bug Title');

    const submitButton = screen.getByRole('button', { name: /作成/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(mockOnSubmit).toHaveBeenCalledWith(
        expect.objectContaining({
          title: 'Test Bug Title',
          type: 'BUG',
          priority: 'MEDIUM',
          severity: 'MAJOR',
        })
      );
    });
  });

  it('should call onCancel when cancel button is clicked', async () => {
    const user = userEvent.setup();

    render(<BugForm projectId="1" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const cancelButton = screen.getByRole('button', { name: /キャンセル/ });
    await user.click(cancelButton);

    expect(mockOnCancel).toHaveBeenCalled();
  });

  it('should disable form when isLoading is true', () => {
    render(
      <BugForm projectId="1" onSubmit={mockOnSubmit} onCancel={mockOnCancel} isLoading={true} />
    );

    expect(screen.getByLabelText(/タイトル/)).toBeDisabled();
    expect(screen.getByRole('button', { name: /保存中/ })).toBeDisabled();
    expect(screen.getByRole('button', { name: /キャンセル/ })).toBeDisabled();
  });

  it('should show "更新" button when editing existing bug', () => {
    const existingBug = {
      id: BigInt(1),
      projectId: BigInt(1),
      parentBugId: null,
      testResultId: null,
      title: 'Existing Bug',
      description: 'Description',
      type: 'BUG' as const,
      status: 'NEW' as const,
      priority: 'HIGH' as const,
      severity: 'CRITICAL' as const,
      assigneeId: null,
      reporterId: BigInt(1),
      stepsToReproduce: null,
      expectedResult: null,
      actualResult: null,
      environment: null,
      version: null,
      fixedVersion: null,
      dueDate: null,
      resolvedAt: null,
      closedAt: null,
      externalId: null,
      externalUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <BugForm projectId="1" bug={existingBug} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(screen.getByRole('button', { name: /更新/ })).toBeInTheDocument();
  });

  it('should fill form with existing bug data when editing', () => {
    const existingBug = {
      id: BigInt(1),
      projectId: BigInt(1),
      parentBugId: null,
      testResultId: null,
      title: 'Existing Bug',
      description: 'Bug description',
      type: 'FEATURE' as const,
      status: 'OPEN' as const,
      priority: 'HIGH' as const,
      severity: 'CRITICAL' as const,
      assigneeId: null,
      reporterId: BigInt(1),
      stepsToReproduce: 'Step 1',
      expectedResult: 'Expected',
      actualResult: 'Actual',
      environment: 'Chrome',
      version: '1.0.0',
      fixedVersion: null,
      dueDate: new Date('2026-12-31'),
      resolvedAt: null,
      closedAt: null,
      externalId: null,
      externalUrl: null,
      createdAt: new Date(),
      updatedAt: new Date(),
    };

    render(
      <BugForm projectId="1" bug={existingBug} onSubmit={mockOnSubmit} onCancel={mockOnCancel} />
    );

    expect(screen.getByLabelText(/タイトル/)).toHaveValue('Existing Bug');
    expect(screen.getByLabelText(/説明/)).toHaveValue('Bug description');
    expect(screen.getByLabelText(/再現手順/)).toHaveValue('Step 1');
    expect(screen.getByLabelText(/期待結果/)).toHaveValue('Expected');
    expect(screen.getByLabelText(/実際の結果/)).toHaveValue('Actual');
    expect(screen.getByLabelText(/環境/)).toHaveValue('Chrome');
    expect(screen.getByLabelText(/バージョン/)).toHaveValue('1.0.0');
  });

  it('should show error when onSubmit throws', async () => {
    const user = userEvent.setup();
    mockOnSubmit.mockRejectedValue(new Error('API Error'));

    render(<BugForm projectId="1" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    const titleInput = screen.getByLabelText(/タイトル/);
    await user.type(titleInput, 'Test Bug');

    const submitButton = screen.getByRole('button', { name: /作成/ });
    await user.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('API Error')).toBeInTheDocument();
    });
  });

  it('should fetch project members on mount', async () => {
    render(<BugForm projectId="123" onSubmit={mockOnSubmit} onCancel={mockOnCancel} />);

    await waitFor(() => {
      expect(global.fetch).toHaveBeenCalledWith('/api/projects/123/members');
    });
  });
});
