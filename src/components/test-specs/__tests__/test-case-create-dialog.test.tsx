import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestCaseCreateDialog } from '../test-case-create-dialog';
import type { TestSectionWithChildren } from '@/types/test-section';

// Mock next/navigation
const mockRefresh = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: mockRefresh,
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

describe('TestCaseCreateDialog', () => {
  const mockSections: TestSectionWithChildren[] = [
    {
      id: 'section-1',
      testSpecId: 'spec-1',
      parentId: null,
      name: 'Section 1',
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
      children: [],
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render trigger button', () => {
    render(<TestCaseCreateDialog testSpecId="spec-1" />);
    expect(screen.getByRole('button', { name: /新規テストケース/ })).toBeDefined();
  });

  it('should open dialog when trigger is clicked', async () => {
    render(<TestCaseCreateDialog testSpecId="spec-1" />);

    const triggerButton = screen.getByRole('button', { name: /新規テストケース/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テストケース作成')).toBeDefined();
    });
  });

  it('should close dialog when cancel is clicked', async () => {
    render(<TestCaseCreateDialog testSpecId="spec-1" />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テストケース/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テストケース作成')).toBeDefined();
    });

    // Close dialog
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('新規テストケース作成')).toBeNull();
    });
  });

  it('should call API with correct data on submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'tc-1', title: 'New Test Case' }),
    });

    const onSuccess = vi.fn();
    render(<TestCaseCreateDialog testSpecId="spec-1" onSuccess={onSuccess} />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テストケース/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テストケース作成')).toBeDefined();
    });

    // Fill form
    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'New Test Case' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/test-specs/spec-1/cases', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: 'New Test Case',
          description: null,
          preconditions: null,
          priority: 'MEDIUM',
          testType: 'FUNCTIONAL',
          testTechnique: 'OTHER',
          sectionId: null,
          isMatrix: false,
        }),
      });
    });
  });

  it('should call onSuccess after successful creation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'tc-1', title: 'New Test Case' }),
    });

    const onSuccess = vi.fn();
    render(<TestCaseCreateDialog testSpecId="spec-1" onSuccess={onSuccess} />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テストケース/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テストケース作成')).toBeDefined();
    });

    // Fill form
    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'New Test Case' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(onSuccess).toHaveBeenCalled();
    });
  });

  it('should close dialog after successful creation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'tc-1', title: 'New Test Case' }),
    });

    render(<TestCaseCreateDialog testSpecId="spec-1" />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テストケース/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テストケース作成')).toBeDefined();
    });

    // Fill form
    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'New Test Case' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('新規テストケース作成')).toBeNull();
    });
  });

  it('should show error message on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'テストケースの作成に失敗しました。' }),
    });

    render(<TestCaseCreateDialog testSpecId="spec-1" />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テストケース/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テストケース作成')).toBeDefined();
    });

    // Fill form
    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'New Test Case' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('テストケースの作成に失敗しました。')).toBeDefined();
    });
  });

  it('should render dialog description', async () => {
    render(<TestCaseCreateDialog testSpecId="spec-1" />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テストケース/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新しいテストケースの情報を入力してください。')).toBeDefined();
    });
  });

  it('should render with custom trigger', () => {
    render(<TestCaseCreateDialog testSpecId="spec-1" trigger={<button>Custom Trigger</button>} />);

    expect(screen.getByRole('button', { name: 'Custom Trigger' })).toBeDefined();
  });

  it('should use defaultSectionId when provided', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'tc-1', title: 'New Test Case' }),
    });

    render(
      <TestCaseCreateDialog
        testSpecId="spec-1"
        sections={mockSections}
        defaultSectionId="section-1"
      />
    );

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テストケース/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テストケース作成')).toBeDefined();
    });

    // Fill form
    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'New Test Case' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        '/api/test-specs/spec-1/cases',
        expect.objectContaining({
          body: expect.stringContaining('"sectionId":"section-1"'),
        })
      );
    });
  });

  it('should pass sections to form', async () => {
    render(<TestCaseCreateDialog testSpecId="spec-1" sections={mockSections} />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テストケース/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テストケース作成')).toBeDefined();
    });

    // Section select should be visible
    expect(screen.getByLabelText(/セクション/)).toBeDefined();
  });

  it('should call router.refresh after successful creation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: 'tc-1', title: 'New Test Case' }),
    });

    render(<TestCaseCreateDialog testSpecId="spec-1" />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テストケース/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テストケース作成')).toBeDefined();
    });

    // Fill form
    const titleInput = screen.getByLabelText(/テストケース名/);
    fireEvent.change(titleInput, { target: { value: 'New Test Case' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockRefresh).toHaveBeenCalled();
    });
  });
});
