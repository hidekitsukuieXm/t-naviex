import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagManagementDialog } from '../tag-management-dialog';
import type { TagWithCount } from '@/types/tag';

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

describe('TagManagementDialog', () => {
  const mockTags: TagWithCount[] = [
    {
      id: '1',
      projectId: '100',
      name: 'Bug',
      color: '#ef4444',
      description: 'Bug issues',
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      usageCount: 5,
    },
    {
      id: '2',
      projectId: '100',
      name: 'Feature',
      color: '#22c55e',
      description: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
      usageCount: 10,
    },
  ];

  const defaultProps = {
    projectId: '100',
    open: true,
    onOpenChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockReset();
  });

  describe('Rendering', () => {
    it('should render dialog with title', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockTags }),
      });

      const { rerender } = render(<TagManagementDialog {...defaultProps} open={false} />);

      // Open the dialog
      rerender(<TagManagementDialog {...defaultProps} open={true} />);

      expect(screen.getByText('タグ管理')).toBeDefined();
    });

    it('should show loading state', async () => {
      let resolvePromise: (value: unknown) => void;
      const fetchPromise = new Promise((resolve) => {
        resolvePromise = resolve;
      });
      mockFetch.mockReturnValueOnce(fetchPromise);

      const { rerender } = render(<TagManagementDialog {...defaultProps} open={false} />);
      rerender(<TagManagementDialog {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(screen.getByRole('dialog')).toBeDefined();
      });

      resolvePromise!({
        ok: true,
        json: () => Promise.resolve({ tags: [] }),
      });
    });

    it('should show empty state when no tags', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: [] }),
      });

      const { rerender } = render(<TagManagementDialog {...defaultProps} open={false} />);
      rerender(<TagManagementDialog {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(screen.getByText('タグがありません。')).toBeDefined();
      });
    });

    it('should render tag list', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockTags }),
      });

      const { rerender } = render(<TagManagementDialog {...defaultProps} open={false} />);
      rerender(<TagManagementDialog {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(screen.getByText('Bug')).toBeDefined();
        expect(screen.getByText('Feature')).toBeDefined();
      });
    });

    it('should show usage count for each tag', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockTags }),
      });

      const { rerender } = render(<TagManagementDialog {...defaultProps} open={false} />);
      rerender(<TagManagementDialog {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(screen.getByText('5件のテストケースで使用')).toBeDefined();
        expect(screen.getByText('10件のテストケースで使用')).toBeDefined();
      });
    });
  });

  describe('Tag creation', () => {
    it('should show create form when button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockTags }),
      });

      const { rerender } = render(<TagManagementDialog {...defaultProps} open={false} />);
      rerender(<TagManagementDialog {...defaultProps} open={true} />);

      await waitFor(() => {
        const createButton = screen.getByText('新しいタグを作成');
        fireEvent.click(createButton);
      });

      expect(screen.getByPlaceholderText('タグ名')).toBeDefined();
    });

    it('should create tag on form submit', async () => {
      const { toast } = await import('sonner');
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: mockTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              id: '3',
              projectId: '100',
              name: 'NewTag',
              color: '#3b82f6',
              description: null,
              createdAt: '2024-01-01T00:00:00Z',
              updatedAt: '2024-01-01T00:00:00Z',
            }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () =>
            Promise.resolve({
              tags: [
                ...mockTags,
                {
                  id: '3',
                  projectId: '100',
                  name: 'NewTag',
                  color: '#3b82f6',
                  description: null,
                  createdAt: '2024-01-01T00:00:00Z',
                  updatedAt: '2024-01-01T00:00:00Z',
                  usageCount: 0,
                },
              ],
            }),
        });

      const { rerender } = render(<TagManagementDialog {...defaultProps} open={false} />);
      rerender(<TagManagementDialog {...defaultProps} open={true} />);

      await waitFor(() => {
        const createButton = screen.getByText('新しいタグを作成');
        fireEvent.click(createButton);
      });

      const nameInput = screen.getByPlaceholderText('タグ名');
      fireEvent.change(nameInput, { target: { value: 'NewTag' } });

      const submitButton = screen.getByRole('button', { name: '作成' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith(
          '/api/projects/100/tags',
          expect.objectContaining({
            method: 'POST',
          })
        );
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('タグを作成しました。');
      });
    });
  });

  describe('Tag editing', () => {
    it('should populate form with tag data when edit button is clicked', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockTags }),
      });

      const { rerender } = render(<TagManagementDialog {...defaultProps} open={false} />);
      rerender(<TagManagementDialog {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(screen.getByText('Bug')).toBeDefined();
      });

      // Find edit button (first one should be for Bug)
      const editButtons = screen.getAllByRole('button', { name: '' });
      const editButton = editButtons.find((btn) => btn.querySelector('svg.lucide-pencil'));
      if (editButton) {
        fireEvent.click(editButton);
      }

      await waitFor(() => {
        const nameInput = screen.getByPlaceholderText('タグ名');
        expect(nameInput).toHaveProperty('value', 'Bug');
      });
    });
  });

  describe('Tag deletion', () => {
    it('should show delete confirmation dialog', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockTags }),
      });

      const { rerender } = render(<TagManagementDialog {...defaultProps} open={false} />);
      rerender(<TagManagementDialog {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(screen.getByText('Bug')).toBeDefined();
      });

      // Find delete button (should be second button per tag)
      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButton = deleteButtons.find((btn) => btn.querySelector('svg.lucide-trash-2'));
      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      await waitFor(() => {
        expect(screen.getByText('タグの削除')).toBeDefined();
        expect(
          screen.getByText(
            /を削除しますか？このタグが付いているすべてのテストケースからタグが削除されます。/
          )
        ).toBeDefined();
      });
    });

    it('should delete tag when confirmed', async () => {
      const { toast } = await import('sonner');
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: mockTags }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ success: true }),
        })
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: [mockTags[1]] }),
        });

      const { rerender } = render(<TagManagementDialog {...defaultProps} open={false} />);
      rerender(<TagManagementDialog {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(screen.getByText('Bug')).toBeDefined();
      });

      // Find and click delete button
      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButton = deleteButtons.find((btn) => btn.querySelector('svg.lucide-trash-2'));
      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      await waitFor(() => {
        expect(screen.getByText('タグの削除')).toBeDefined();
      });

      // Confirm deletion
      const confirmButton = screen.getByRole('button', { name: '削除' });
      fireEvent.click(confirmButton);

      await waitFor(() => {
        expect(mockFetch).toHaveBeenCalledWith('/api/projects/100/tags/1', { method: 'DELETE' });
      });

      await waitFor(() => {
        expect(toast.success).toHaveBeenCalledWith('タグを削除しました。');
      });
    });

    it('should close delete dialog on cancel', async () => {
      mockFetch.mockResolvedValueOnce({
        ok: true,
        json: () => Promise.resolve({ tags: mockTags }),
      });

      const { rerender } = render(<TagManagementDialog {...defaultProps} open={false} />);
      rerender(<TagManagementDialog {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(screen.getByText('Bug')).toBeDefined();
      });

      // Find and click delete button
      const deleteButtons = screen.getAllByRole('button', { name: '' });
      const deleteButton = deleteButtons.find((btn) => btn.querySelector('svg.lucide-trash-2'));
      if (deleteButton) {
        fireEvent.click(deleteButton);
      }

      await waitFor(() => {
        expect(screen.getByText('タグの削除')).toBeDefined();
      });

      // Cancel deletion
      const cancelButton = screen.getByRole('button', { name: 'キャンセル' });
      fireEvent.click(cancelButton);

      await waitFor(() => {
        expect(screen.queryByText('タグの削除')).toBeNull();
      });
    });
  });

  describe('Error handling', () => {
    it('should show error toast on fetch failure', async () => {
      const { toast } = await import('sonner');
      mockFetch.mockResolvedValueOnce({
        ok: false,
        json: () => Promise.resolve({ error: 'Failed to fetch' }),
      });

      const { rerender } = render(<TagManagementDialog {...defaultProps} open={false} />);
      rerender(<TagManagementDialog {...defaultProps} open={true} />);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('タグの取得に失敗しました。');
      });
    });

    it('should show error toast on create failure', async () => {
      const { toast } = await import('sonner');
      mockFetch
        .mockResolvedValueOnce({
          ok: true,
          json: () => Promise.resolve({ tags: mockTags }),
        })
        .mockResolvedValueOnce({
          ok: false,
          json: () => Promise.resolve({ error: '同じ名前のタグが既に存在します。' }),
        });

      const { rerender } = render(<TagManagementDialog {...defaultProps} open={false} />);
      rerender(<TagManagementDialog {...defaultProps} open={true} />);

      await waitFor(() => {
        const createButton = screen.getByText('新しいタグを作成');
        fireEvent.click(createButton);
      });

      const nameInput = screen.getByPlaceholderText('タグ名');
      fireEvent.change(nameInput, { target: { value: 'Bug' } });

      const submitButton = screen.getByRole('button', { name: '作成' });
      fireEvent.click(submitButton);

      await waitFor(() => {
        expect(toast.error).toHaveBeenCalledWith('同じ名前のタグが既に存在します。');
      });
    });
  });
});
