import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagInput } from '../tag-input';
import type { Tag, TestCaseTagInfo } from '@/types/tag';

describe('TagInput', () => {
  const mockTags: Tag[] = [
    {
      id: '1',
      projectId: '100',
      name: 'Bug',
      color: '#ef4444',
      description: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      projectId: '100',
      name: 'Feature',
      color: '#22c55e',
      description: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '3',
      projectId: '100',
      name: 'Enhancement',
      color: '#3b82f6',
      description: null,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockSelectedTags: TestCaseTagInfo[] = [{ id: '1', name: 'Bug', color: '#ef4444' }];

  const defaultProps = {
    projectId: '100',
    selectedTags: [] as TestCaseTagInfo[],
    availableTags: mockTags,
    onTagsChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Rendering', () => {
    it('should render trigger button', () => {
      render(<TagInput {...defaultProps} />);
      expect(screen.getByRole('combobox')).toBeDefined();
    });

    it('should render selected tags', () => {
      render(<TagInput {...defaultProps} selectedTags={mockSelectedTags} />);
      expect(screen.getByText('Bug')).toBeDefined();
    });

    it('should render multiple selected tags', () => {
      const selectedTags: TestCaseTagInfo[] = [
        { id: '1', name: 'Bug', color: '#ef4444' },
        { id: '2', name: 'Feature', color: '#22c55e' },
      ];
      render(<TagInput {...defaultProps} selectedTags={selectedTags} />);
      expect(screen.getByText('Bug')).toBeDefined();
      expect(screen.getByText('Feature')).toBeDefined();
    });

    it('should disable trigger when disabled prop is true', () => {
      render(<TagInput {...defaultProps} disabled />);
      expect(screen.getByRole('combobox')).toHaveProperty('disabled', true);
    });
  });

  describe('Tag selection', () => {
    it('should open dropdown when clicked', async () => {
      render(<TagInput {...defaultProps} />);

      fireEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('タグを検索...')).toBeDefined();
      });
    });

    it('should show available tags in dropdown', async () => {
      render(<TagInput {...defaultProps} />);

      fireEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByText('Bug')).toBeDefined();
        expect(screen.getByText('Feature')).toBeDefined();
        expect(screen.getByText('Enhancement')).toBeDefined();
      });
    });

    it('should call onTagsChange when tag is selected', async () => {
      const onTagsChange = vi.fn();
      render(<TagInput {...defaultProps} onTagsChange={onTagsChange} />);

      fireEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        const option = screen.getByText('Bug');
        fireEvent.click(option);
      });

      expect(onTagsChange).toHaveBeenCalledWith([{ id: '1', name: 'Bug', color: '#ef4444' }]);
    });

    it('should call onTagsChange to remove tag when selected tag is clicked', async () => {
      const onTagsChange = vi.fn();
      render(
        <TagInput {...defaultProps} selectedTags={mockSelectedTags} onTagsChange={onTagsChange} />
      );

      fireEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        // Find all 'Bug' text elements - one is in the selected badge, one in the dropdown
        const bugElements = screen.getAllByText('Bug');
        // Click the one in the dropdown (should be in a CommandItem)
        const dropdownOption = bugElements.find((el) => el.closest('[cmdk-item]') !== null);
        if (dropdownOption) {
          fireEvent.click(dropdownOption);
        }
      });

      expect(onTagsChange).toHaveBeenCalledWith([]);
    });
  });

  describe('Tag removal', () => {
    it('should call onTagsChange when remove button is clicked', () => {
      const onTagsChange = vi.fn();
      render(
        <TagInput {...defaultProps} selectedTags={mockSelectedTags} onTagsChange={onTagsChange} />
      );

      // Find and click remove button
      const removeButton = screen.getByLabelText('Bugを削除');
      fireEvent.click(removeButton);

      expect(onTagsChange).toHaveBeenCalledWith([]);
    });

    it('should not show remove button when disabled', () => {
      render(<TagInput {...defaultProps} selectedTags={mockSelectedTags} disabled />);

      expect(screen.queryByLabelText('Bugを削除')).toBeNull();
    });
  });

  describe('Search filtering', () => {
    it('should filter tags by search input', async () => {
      render(<TagInput {...defaultProps} />);

      fireEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('タグを検索...')).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText('タグを検索...');
      fireEvent.change(searchInput, { target: { value: 'Bug' } });

      await waitFor(() => {
        expect(screen.getByText('Bug')).toBeDefined();
        expect(screen.queryByText('Feature')).toBeNull();
        expect(screen.queryByText('Enhancement')).toBeNull();
      });
    });
  });

  describe('Tag creation', () => {
    it('should show create option when search term does not match any tag', async () => {
      const onCreateTag = vi.fn().mockResolvedValue({
        id: '4',
        projectId: '100',
        name: 'NewTag',
        color: '#3b82f6',
        description: null,
        createdAt: '2024-01-01T00:00:00Z',
        updatedAt: '2024-01-01T00:00:00Z',
      });

      render(<TagInput {...defaultProps} onCreateTag={onCreateTag} />);

      fireEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('タグを検索...')).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText('タグを検索...');
      fireEvent.change(searchInput, { target: { value: 'NewTag' } });

      await waitFor(() => {
        expect(screen.getByText(/「NewTag」を作成/)).toBeDefined();
      });
    });

    it('should not show create option when search term matches existing tag', async () => {
      const onCreateTag = vi.fn();
      render(<TagInput {...defaultProps} onCreateTag={onCreateTag} />);

      fireEvent.click(screen.getByRole('combobox'));

      await waitFor(() => {
        expect(screen.getByPlaceholderText('タグを検索...')).toBeDefined();
      });

      const searchInput = screen.getByPlaceholderText('タグを検索...');
      fireEvent.change(searchInput, { target: { value: 'Bug' } });

      await waitFor(() => {
        expect(screen.queryByText(/「Bug」を作成/)).toBeNull();
      });
    });
  });
});
