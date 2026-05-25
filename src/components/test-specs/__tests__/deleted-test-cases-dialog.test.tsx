import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { DeletedTestCasesDialog } from '../deleted-test-cases-dialog';
import type { TestCase } from '@/types/test-case';

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
  },
}));

describe('DeletedTestCasesDialog', () => {
  const mockDeletedTestCases: TestCase[] = [
    {
      id: '1',
      testSpecId: '100',
      sectionId: '10',
      title: 'Deleted Test Case 1',
      description: 'Description 1',
      preconditions: null,
      expectedResult: null,
      checkpoint: null,
      scenario: null,
      testEnvironment: null,
      notes: null,
      tags: [],
      classification: null,
      referenceId: null,
      estimatedTime: null,
      priority: 'MEDIUM',
      testType: 'FUNCTIONAL',
      testTechnique: 'OTHER',
      isMatrix: false,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: '2024-01-02T00:00:00Z',
    },
    {
      id: '2',
      testSpecId: '100',
      sectionId: null,
      title: 'Deleted Test Case 2',
      description: 'Description 2',
      preconditions: null,
      expectedResult: null,
      checkpoint: null,
      scenario: null,
      testEnvironment: null,
      notes: null,
      tags: [],
      classification: null,
      referenceId: null,
      estimatedTime: null,
      priority: 'HIGH',
      testType: 'INTEGRATION',
      testTechnique: 'OTHER',
      isMatrix: false,
      sortOrder: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      deletedAt: '2024-01-03T00:00:00Z',
    },
  ];

  const defaultProps = {
    testSpecId: '100',
    onRestore: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Rendering', () => {
    it('should render trigger button', () => {
      render(<DeletedTestCasesDialog {...defaultProps} />);
      expect(screen.getByText(/削除済み/)).toBeDefined();
    });

    it('should render custom trigger when provided', () => {
      render(
        <DeletedTestCasesDialog {...defaultProps} trigger={<button>カスタムトリガー</button>} />
      );
      expect(screen.getByText('カスタムトリガー')).toBeDefined();
    });
  });

  describe('Dialog behavior', () => {
    it('should open dialog and fetch deleted test cases', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            testCases: mockDeletedTestCases,
            total: 2,
            page: 1,
            limit: 20,
            totalPages: 1,
          }),
      });

      render(<DeletedTestCasesDialog {...defaultProps} />);

      const trigger = screen.getByText(/削除済み/);
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/test-specs/100/cases/deleted');
      });

      await waitFor(() => {
        expect(screen.getByText('削除済みテストケース')).toBeDefined();
        expect(screen.getByText('Deleted Test Case 1')).toBeDefined();
        expect(screen.getByText('Deleted Test Case 2')).toBeDefined();
      });
    });

    it('should show empty state when no deleted test cases', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            testCases: [],
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
          }),
      });

      render(<DeletedTestCasesDialog {...defaultProps} />);

      const trigger = screen.getByText(/削除済み/);
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('削除済みテストケースはありません。')).toBeDefined();
      });
    });

    it('should show loading state', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(fetchPromise);

      render(<DeletedTestCasesDialog {...defaultProps} />);

      const trigger = screen.getByText(/削除済み/);
      fireEvent.click(trigger);

      // Should show loading spinner
      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeDefined();
      });

      // Resolve the fetch
      resolvePromise!({
        ok: true,
        json: () =>
          Promise.resolve({
            testCases: [],
            total: 0,
            page: 1,
            limit: 20,
            totalPages: 0,
          }),
      });
    });
  });

  describe('Restore functionality', () => {
    it('should call restore API when restore button is clicked', async () => {
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              testCases: mockDeletedTestCases,
              total: 2,
              page: 1,
              limit: 20,
              totalPages: 1,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...mockDeletedTestCases[0], deletedAt: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              testCases: [mockDeletedTestCases[1]],
              total: 1,
              page: 1,
              limit: 20,
              totalPages: 1,
            }),
        });

      render(<DeletedTestCasesDialog {...defaultProps} />);

      const trigger = screen.getByText(/削除済み/);
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Deleted Test Case 1')).toBeDefined();
      });

      // Find and click restore button
      const restoreButtons = screen.getAllByRole('button', { name: '復元' });
      fireEvent.click(restoreButtons[0]);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/test-specs/100/cases/1/restore', {
          method: 'POST',
        });
      });
    });

    it('should call onRestore callback after successful restore', async () => {
      const onRestore = vi.fn();
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              testCases: mockDeletedTestCases,
              total: 2,
              page: 1,
              limit: 20,
              totalPages: 1,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...mockDeletedTestCases[0], deletedAt: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              testCases: [mockDeletedTestCases[1]],
              total: 1,
              page: 1,
              limit: 20,
              totalPages: 1,
            }),
        });

      render(<DeletedTestCasesDialog {...defaultProps} onRestore={onRestore} />);

      const trigger = screen.getByText(/削除済み/);
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Deleted Test Case 1')).toBeDefined();
      });

      const restoreButtons = screen.getAllByRole('button', { name: '復元' });
      fireEvent.click(restoreButtons[0]);

      await waitFor(() => {
        expect(onRestore).toHaveBeenCalled();
      });
    });

    it('should show success toast on restore', async () => {
      const { toast } = await import('sonner');
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              testCases: mockDeletedTestCases,
              total: 2,
              page: 1,
              limit: 20,
              totalPages: 1,
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ ...mockDeletedTestCases[0], deletedAt: null }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              testCases: [mockDeletedTestCases[1]],
              total: 1,
              page: 1,
              limit: 20,
              totalPages: 1,
            }),
        });

      render(<DeletedTestCasesDialog {...defaultProps} />);

      const trigger = screen.getByText(/削除済み/);
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Deleted Test Case 1')).toBeDefined();
      });

      const restoreButtons = screen.getAllByRole('button', { name: '復元' });
      fireEvent.click(restoreButtons[0]);

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('テストケースを復元しました。');
      });
    });

    it('should disable restore button when locked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () =>
          Promise.resolve({
            testCases: mockDeletedTestCases,
            total: 2,
            page: 1,
            limit: 20,
            totalPages: 1,
          }),
      });

      render(<DeletedTestCasesDialog {...defaultProps} isLocked />);

      const trigger = screen.getByText(/削除済み/);
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Deleted Test Case 1')).toBeDefined();
      });

      const restoreButtons = screen.getAllByRole('button', { name: '復元' });
      expect(restoreButtons[0]).toHaveProperty('disabled', true);
    });
  });

  describe('Error handling', () => {
    it('should show error toast on fetch failure', async () => {
      const { toast } = await import('sonner');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Fetch failed' }),
      });

      render(<DeletedTestCasesDialog {...defaultProps} />);

      const trigger = screen.getByText(/削除済み/);
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalled();
      });
    });

    it('should show error toast on restore failure', async () => {
      const { toast } = await import('sonner');
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              testCases: mockDeletedTestCases,
              total: 2,
              page: 1,
              limit: 20,
              totalPages: 1,
            }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: 'Restore failed' }),
        });

      render(<DeletedTestCasesDialog {...defaultProps} />);

      const trigger = screen.getByText(/削除済み/);
      fireEvent.click(trigger);

      await waitFor(() => {
        expect(screen.getByText('Deleted Test Case 1')).toBeDefined();
      });

      const restoreButtons = screen.getAllByRole('button', { name: '復元' });
      fireEvent.click(restoreButtons[0]);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Restore failed');
      });
    });
  });
});
