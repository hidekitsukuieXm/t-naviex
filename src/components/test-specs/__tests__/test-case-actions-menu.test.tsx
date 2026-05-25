import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestCaseActionsMenu } from '../test-case-actions-menu';
import type { TestCase } from '@/types/test-case';
import type { TestSectionWithChildren } from '@/types/test-section';

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

describe('TestCaseActionsMenu', () => {
  const mockTestCase: TestCase = {
    id: '1',
    testSpecId: '100',
    sectionId: '10',
    title: 'Test Case 1',
    description: 'Description',
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
    deletedAt: null,
  };

  const mockSections: TestSectionWithChildren[] = [
    {
      id: '10',
      testSpecId: '100',
      parentId: null,
      name: 'Section 1',
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      children: [
        {
          id: '11',
          testSpecId: '100',
          parentId: '10',
          name: 'Section 1-1',
          sortOrder: 0,
          createdAt: '2024-01-01T00:00:00Z',
          updatedAt: '2024-01-01T00:00:00Z',
          children: [],
        },
      ],
    },
    {
      id: '20',
      testSpecId: '100',
      parentId: null,
      name: 'Section 2',
      sortOrder: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      children: [],
    },
  ];

  const defaultProps = {
    testCase: mockTestCase,
    testSpecId: '100',
    sections: mockSections,
    onSuccess: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Rendering', () => {
    it('should render action button', () => {
      render(<TestCaseActionsMenu {...defaultProps} />);
      expect(screen.getByRole('button', { name: 'アクション' })).toBeDefined();
    });

    it('should not render when locked', () => {
      render(<TestCaseActionsMenu {...defaultProps} isLocked />);
      expect(screen.queryByRole('button', { name: 'アクション' })).toBeNull();
    });

    it('should show dropdown menu on click', async () => {
      render(<TestCaseActionsMenu {...defaultProps} />);

      const button = screen.getByRole('button', { name: 'アクション' });
      fireEvent.click(button);

      await waitFor(() => {
        expect(screen.getByText('コピー')).toBeDefined();
        expect(screen.getByText('移動')).toBeDefined();
        expect(screen.getByText('削除')).toBeDefined();
      });
    });
  });

  describe('Delete functionality', () => {
    it('should open delete confirmation dialog', async () => {
      render(<TestCaseActionsMenu {...defaultProps} />);

      const button = screen.getByRole('button', { name: 'アクション' });
      fireEvent.click(button);

      const deleteItem = await screen.findByText('削除');
      fireEvent.click(deleteItem);

      await waitFor(() => {
        expect(screen.getByText('テストケースの削除')).toBeDefined();
        expect(screen.getByText(/を削除しますか？/)).toBeDefined();
      });
    });

    it('should call delete API on confirm', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ success: true }),
      });

      render(<TestCaseActionsMenu {...defaultProps} />);

      // Open menu
      fireEvent.click(screen.getByRole('button', { name: 'アクション' }));

      // Click delete
      const deleteItem = await screen.findByText('削除');
      fireEvent.click(deleteItem);

      // Confirm delete
      const confirmButton = await screen.findByRole('button', { name: '削除' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/test-specs/100/cases/1', { method: 'DELETE' });
      });
    });

    it('should close dialog on cancel', async () => {
      render(<TestCaseActionsMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'アクション' }));
      const deleteItem = await screen.findByText('削除');
      fireEvent.click(deleteItem);

      const cancelButton = await screen.findByRole('button', { name: 'キャンセル' });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('テストケースの削除')).toBeNull();
      });
    });
  });

  describe('Copy functionality', () => {
    it('should open copy dialog', async () => {
      render(<TestCaseActionsMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'アクション' }));
      const copyItem = await screen.findByText('コピー');
      fireEvent.click(copyItem);

      await waitFor(() => {
        expect(screen.getByText('テストケースのコピー')).toBeDefined();
      });
    });

    it('should show section selector in copy dialog', async () => {
      render(<TestCaseActionsMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'アクション' }));
      const copyItem = await screen.findByText('コピー');
      fireEvent.click(copyItem);

      await waitFor(() => {
        expect(screen.getByText('コピー先セクション')).toBeDefined();
      });
    });

    it('should call copy API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ ...mockTestCase, id: '2', title: 'Test Case 1 (コピー)' }),
      });

      render(<TestCaseActionsMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'アクション' }));
      const copyItem = await screen.findByText('コピー');
      fireEvent.click(copyItem);

      // Find and click the copy button in dialog
      const dialogCopyButtons = await screen.findAllByRole('button', { name: 'コピー' });
      const confirmButton = dialogCopyButtons.find((btn) => btn.closest('[role="dialog"]'));
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/test-specs/100/cases/1/copy',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('Move functionality', () => {
    it('should open move dialog', async () => {
      render(<TestCaseActionsMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'アクション' }));
      const moveItem = await screen.findByText('移動');
      fireEvent.click(moveItem);

      await waitFor(() => {
        expect(screen.getByText('テストケースの移動')).toBeDefined();
      });
    });

    it('should call move API', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve(mockTestCase),
      });

      render(<TestCaseActionsMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'アクション' }));
      const moveItem = await screen.findByText('移動');
      fireEvent.click(moveItem);

      // Find and click the move button in dialog
      const dialogMoveButtons = await screen.findAllByRole('button', { name: '移動' });
      const confirmButton = dialogMoveButtons.find((btn) => btn.closest('[role="dialog"]'));
      fireEvent.click(confirmButton!);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/test-specs/100/cases/1/move',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });
    });
  });

  describe('Error handling', () => {
    it('should show error toast on delete failure', async () => {
      const { toast } = await import('sonner');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Delete failed' }),
      });

      render(<TestCaseActionsMenu {...defaultProps} />);

      fireEvent.click(screen.getByRole('button', { name: 'アクション' }));
      const deleteItem = await screen.findByText('削除');
      fireEvent.click(deleteItem);

      const confirmButton = await screen.findByRole('button', { name: '削除' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('Delete failed');
      });
    });
  });
});
