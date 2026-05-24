import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestCaseEditDialog } from '../test-case-edit-dialog';
import type { TestCase } from '@/types/test-case';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TestCaseEditDialog', () => {
  const mockOnOpenChange = vi.fn();
  const mockOnSuccess = vi.fn();

  const mockTestCase: TestCase = {
    id: 'tc-1',
    testSpecId: 'spec-1',
    sectionId: null,
    title: 'Test Case Title',
    description: 'Test description',
    preconditions: 'Test preconditions',
    expectedResult: 'Test expected result',
    checkpoint: 'Test checkpoint',
    scenario: 'Test scenario',
    testEnvironment: 'Test environment',
    notes: 'Test notes',
    tags: ['tag1', 'tag2'],
    classification: 'Classification A',
    referenceId: 'REF-001',
    estimatedTime: 30,
    priority: 'HIGH',
    testType: 'FUNCTIONAL',
    testTechnique: 'BOUNDARY_VALUE_ANALYSIS',
    isMatrix: false,
    sortOrder: 0,
    createdAt: '2024-01-01T00:00:00.000Z',
    updatedAt: '2024-01-01T00:00:00.000Z',
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should show loading state while fetching test case', async () => {
    mockFetch.mockImplementation(
      () =>
        new Promise((resolve) =>
          setTimeout(
            () =>
              resolve({
                ok: true,
                json: async () => mockTestCase,
              }),
            100
          )
        )
    );

    render(
      <TestCaseEditDialog
        testSpecId="spec-1"
        testCaseId="tc-1"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    // Loading state should be visible
    expect(screen.getByText('テストケースの編集')).toBeDefined();
  });

  it('should fetch and display test case data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTestCase,
    });

    render(
      <TestCaseEditDialog
        testSpecId="spec-1"
        testCaseId="tc-1"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/test-specs/spec-1/cases/tc-1');
    });

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Case Title')).toBeDefined();
    });
  });

  it('should show error when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'テストケースが見つかりません。' }),
    });

    render(
      <TestCaseEditDialog
        testSpecId="spec-1"
        testCaseId="tc-1"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByText('テストケースが見つかりません。')).toBeDefined();
    });
  });

  it('should show dialog title and description', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTestCase,
    });

    render(
      <TestCaseEditDialog
        testSpecId="spec-1"
        testCaseId="tc-1"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(screen.getByText('テストケースの編集')).toBeDefined();
    expect(screen.getByText('テストケースの情報を編集してください。')).toBeDefined();
  });

  it('should not fetch when dialog is closed', () => {
    render(
      <TestCaseEditDialog
        testSpecId="spec-1"
        testCaseId="tc-1"
        open={false}
        onOpenChange={mockOnOpenChange}
      />
    );

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('should call onSuccess after successful update', async () => {
    // First fetch for getting the test case
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTestCase,
    });

    // Second fetch for updating
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockTestCase, title: 'Updated Title' }),
    });

    render(
      <TestCaseEditDialog
        testSpecId="spec-1"
        testCaseId="tc-1"
        open={true}
        onOpenChange={mockOnOpenChange}
        onSuccess={mockOnSuccess}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Case Title')).toBeDefined();
    });

    // Change title and submit
    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    const submitButton = screen.getByRole('button', { name: '更新' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockOnSuccess).toHaveBeenCalled();
    });
  });

  it('should show confirm dialog when closing with unsaved changes', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTestCase,
    });

    render(
      <TestCaseEditDialog
        testSpecId="spec-1"
        testCaseId="tc-1"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Case Title')).toBeDefined();
    });

    // Make a change
    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'Changed Title' } });

    // Try to cancel
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText('変更を破棄しますか？')).toBeDefined();
    });
  });

  it('should close without confirm when no changes made', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTestCase,
    });

    render(
      <TestCaseEditDialog
        testSpecId="spec-1"
        testCaseId="tc-1"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Case Title')).toBeDefined();
    });

    // Cancel without making changes
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    // Should close directly
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should continue editing when selecting "編集を続ける" in confirm dialog', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTestCase,
    });

    render(
      <TestCaseEditDialog
        testSpecId="spec-1"
        testCaseId="tc-1"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Case Title')).toBeDefined();
    });

    // Make a change
    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'Changed Title' } });

    // Try to cancel
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText('変更を破棄しますか？')).toBeDefined();
    });

    // Continue editing
    const continueButton = screen.getByRole('button', { name: '編集を続ける' });
    fireEvent.click(continueButton);

    // Should return to edit dialog
    await waitFor(() => {
      expect(screen.getByText('テストケースの編集')).toBeDefined();
    });
  });

  it('should discard changes when selecting "変更を破棄" in confirm dialog', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTestCase,
    });

    render(
      <TestCaseEditDialog
        testSpecId="spec-1"
        testCaseId="tc-1"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Case Title')).toBeDefined();
    });

    // Make a change
    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'Changed Title' } });

    // Try to cancel
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    // Confirm dialog should appear
    await waitFor(() => {
      expect(screen.getByText('変更を破棄しますか？')).toBeDefined();
    });

    // Discard changes
    const discardButton = screen.getByRole('button', { name: '変更を破棄' });
    fireEvent.click(discardButton);

    // Should close the dialog
    await waitFor(() => {
      expect(mockOnOpenChange).toHaveBeenCalledWith(false);
    });
  });

  it('should send PATCH request with correct data', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => mockTestCase,
    });

    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({ ...mockTestCase, title: 'Updated Title' }),
    });

    render(
      <TestCaseEditDialog
        testSpecId="spec-1"
        testCaseId="tc-1"
        open={true}
        onOpenChange={mockOnOpenChange}
      />
    );

    await waitFor(() => {
      expect(screen.getByDisplayValue('Test Case Title')).toBeDefined();
    });

    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'Updated Title' } });

    const submitButton = screen.getByRole('button', { name: '更新' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test-specs/spec-1/cases/tc-1',
        expect.objectContaining({
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
        })
      );
    });
  });
});
