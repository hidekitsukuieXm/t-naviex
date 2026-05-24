import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestSpecCreateDialog } from '../test-spec-create-dialog';

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

describe('TestSpecCreateDialog', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render trigger button', () => {
    render(<TestSpecCreateDialog projectId="1" />);
    expect(screen.getByRole('button', { name: /新規テスト仕様書/ })).toBeDefined();
  });

  it('should open dialog when trigger is clicked', async () => {
    render(<TestSpecCreateDialog projectId="1" />);

    const triggerButton = screen.getByRole('button', { name: /新規テスト仕様書/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テスト仕様書作成')).toBeDefined();
    });
  });

  it('should close dialog when cancel is clicked', async () => {
    render(<TestSpecCreateDialog projectId="1" />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テスト仕様書/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テスト仕様書作成')).toBeDefined();
    });

    // Close dialog
    const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
    fireEvent.click(cancelButton);

    await waitFor(() => {
      expect(screen.queryByText('新規テスト仕様書作成')).toBeNull();
    });
  });

  it('should call API with correct data on submit', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '1', name: 'New Test Spec' }),
    });

    const onSuccess = vi.fn();
    render(<TestSpecCreateDialog projectId="10" onSuccess={onSuccess} />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テスト仕様書/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テスト仕様書作成')).toBeDefined();
    });

    // Fill form
    const nameInput = screen.getByLabelText(/テスト仕様書名/);
    fireEvent.change(nameInput, { target: { value: 'New Test Spec' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/test-specs', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: 'New Test Spec',
          description: '',
          status: 'DRAFT',
          projectId: '10',
        }),
      });
    });
  });

  it('should call onSuccess after successful creation', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () => Promise.resolve({ id: '1', name: 'New Test Spec' }),
    });

    const onSuccess = vi.fn();
    render(<TestSpecCreateDialog projectId="10" onSuccess={onSuccess} />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テスト仕様書/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テスト仕様書作成')).toBeDefined();
    });

    // Fill form
    const nameInput = screen.getByLabelText(/テスト仕様書名/);
    fireEvent.change(nameInput, { target: { value: 'New Test Spec' } });

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
      json: () => Promise.resolve({ id: '1', name: 'New Test Spec' }),
    });

    render(<TestSpecCreateDialog projectId="10" />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テスト仕様書/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テスト仕様書作成')).toBeDefined();
    });

    // Fill form
    const nameInput = screen.getByLabelText(/テスト仕様書名/);
    fireEvent.change(nameInput, { target: { value: 'New Test Spec' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.queryByText('新規テスト仕様書作成')).toBeNull();
    });
  });

  it('should show error message on API failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'テスト仕様書の作成に失敗しました。' }),
    });

    render(<TestSpecCreateDialog projectId="10" />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テスト仕様書/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新規テスト仕様書作成')).toBeDefined();
    });

    // Fill form
    const nameInput = screen.getByLabelText(/テスト仕様書名/);
    fireEvent.change(nameInput, { target: { value: 'New Test Spec' } });

    // Submit
    const submitButton = screen.getByRole('button', { name: '作成' });
    fireEvent.click(submitButton);

    await waitFor(() => {
      expect(screen.getByText('テスト仕様書の作成に失敗しました。')).toBeDefined();
    });
  });

  it('should render dialog description', async () => {
    render(<TestSpecCreateDialog projectId="1" />);

    // Open dialog
    const triggerButton = screen.getByRole('button', { name: /新規テスト仕様書/ });
    fireEvent.click(triggerButton);

    await waitFor(() => {
      expect(screen.getByText('新しいテスト仕様書の情報を入力してください。')).toBeDefined();
    });
  });
});
