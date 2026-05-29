import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TagInput } from '../tag-input';
import type { Tag, TestCaseTagInfo } from '@/types/tag';

// Mock the Popover component to avoid Base UI render prop issues
vi.mock('@/components/ui/popover', () => ({
  Popover: ({ children, open }: { children: React.ReactNode; open?: boolean }) => (
    <div data-testid="popover" data-open={open}>
      {children}
    </div>
  ),
  PopoverTrigger: ({
    children,
    disabled,
    onClick,
    ...props
  }: {
    children: React.ReactNode;
    disabled?: boolean;
    onClick?: () => void;
    role?: string;
  }) => (
    <button
      data-testid="popover-trigger"
      disabled={disabled}
      onClick={onClick}
      role={props.role || 'combobox'}
    >
      {children}
    </button>
  ),
  PopoverContent: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="popover-content">{children}</div>
  ),
}));

// Mock the Command component
vi.mock('@/components/ui/command', () => ({
  Command: ({ children }: { children: React.ReactNode; shouldFilter?: boolean }) => (
    <div data-testid="command">{children}</div>
  ),
  CommandInput: ({
    placeholder,
    value,
    onValueChange,
  }: {
    placeholder?: string;
    value?: string;
    onValueChange?: (value: string) => void;
  }) => (
    <input
      data-testid="command-input"
      placeholder={placeholder}
      value={value}
      onChange={(e) => onValueChange?.(e.target.value)}
    />
  ),
  CommandList: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-list">{children}</div>
  ),
  CommandEmpty: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-empty">{children}</div>
  ),
  CommandGroup: ({ children }: { children: React.ReactNode }) => (
    <div data-testid="command-group">{children}</div>
  ),
  CommandItem: ({
    children,
    onSelect,
    value,
    disabled,
  }: {
    children: React.ReactNode;
    onSelect?: () => void;
    value?: string;
    disabled?: boolean;
  }) => (
    <div
      data-testid="command-item"
      data-value={value}
      data-disabled={disabled}
      onClick={() => !disabled && onSelect?.()}
      cmdk-item=""
    >
      {children}
    </div>
  ),
}));

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
      // Bug appears both in the dropdown and in the selected tags badge
      const bugElements = screen.getAllByText('Bug');
      expect(bugElements.length).toBeGreaterThanOrEqual(1);
      // Check that the badge with remove button exists
      expect(screen.getByLabelText('Bugを削除')).toBeDefined();
    });

    it('should render multiple selected tags', () => {
      const selectedTags: TestCaseTagInfo[] = [
        { id: '1', name: 'Bug', color: '#ef4444' },
        { id: '2', name: 'Feature', color: '#22c55e' },
      ];
      render(<TagInput {...defaultProps} selectedTags={selectedTags} />);
      // Tags appear both in dropdown and in selected badges
      const bugElements = screen.getAllByText('Bug');
      expect(bugElements.length).toBeGreaterThanOrEqual(1);
      const featureElements = screen.getAllByText('Feature');
      expect(featureElements.length).toBeGreaterThanOrEqual(1);
      // Check that remove buttons exist for both tags
      expect(screen.getByLabelText('Bugを削除')).toBeDefined();
      expect(screen.getByLabelText('Featureを削除')).toBeDefined();
    });

    it('should disable trigger when disabled prop is true', () => {
      render(<TagInput {...defaultProps} disabled />);
      expect(screen.getByRole('combobox')).toHaveProperty('disabled', true);
    });
  });

  describe('Tag selection', () => {
    it('should render dropdown content', () => {
      render(<TagInput {...defaultProps} />);
      // The mocked components render content directly (no open state needed)
      expect(screen.getByPlaceholderText('タグを検索...')).toBeDefined();
    });

    it('should show available tags in dropdown', () => {
      render(<TagInput {...defaultProps} />);
      // With mocked components, tags are rendered directly
      const bugElements = screen.getAllByText('Bug');
      expect(bugElements.length).toBeGreaterThan(0);
      expect(screen.getByText('Feature')).toBeDefined();
      expect(screen.getByText('Enhancement')).toBeDefined();
    });

    it('should call onTagsChange when tag is selected', () => {
      const onTagsChange = vi.fn();
      render(<TagInput {...defaultProps} onTagsChange={onTagsChange} />);

      // Find and click on a command item
      const commandItems = screen.getAllByTestId('command-item');
      const bugItem = commandItems.find((item) => item.getAttribute('data-value') === '1');
      if (bugItem) {
        fireEvent.click(bugItem);
      }

      expect(onTagsChange).toHaveBeenCalledWith([{ id: '1', name: 'Bug', color: '#ef4444' }]);
    });

    it('should call onTagsChange to remove tag when selected tag is clicked', () => {
      const onTagsChange = vi.fn();
      render(
        <TagInput {...defaultProps} selectedTags={mockSelectedTags} onTagsChange={onTagsChange} />
      );

      // Find the command item for Bug (which is already selected)
      const commandItems = screen.getAllByTestId('command-item');
      const bugItem = commandItems.find((item) => item.getAttribute('data-value') === '1');
      if (bugItem) {
        fireEvent.click(bugItem);
      }

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

      const searchInput = screen.getByPlaceholderText('タグを検索...');
      fireEvent.change(searchInput, { target: { value: 'Bug' } });

      await waitFor(() => {
        // After filtering, only Bug should be in command items
        const commandItems = screen.getAllByTestId('command-item');
        const bugItem = commandItems.find((item) => item.getAttribute('data-value') === '1');
        expect(bugItem).toBeDefined();

        // Feature and Enhancement should not be in the items (filtered out)
        const featureItem = commandItems.find((item) => item.getAttribute('data-value') === '2');
        expect(featureItem).toBeUndefined();
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

      const searchInput = screen.getByPlaceholderText('タグを検索...');
      fireEvent.change(searchInput, { target: { value: 'NewTag' } });

      await waitFor(() => {
        expect(screen.getByText(/「NewTag」を作成/)).toBeDefined();
      });
    });

    it('should not show create option when search term matches existing tag', async () => {
      const onCreateTag = vi.fn();
      render(<TagInput {...defaultProps} onCreateTag={onCreateTag} />);

      const searchInput = screen.getByPlaceholderText('タグを検索...');
      fireEvent.change(searchInput, { target: { value: 'Bug' } });

      await waitFor(() => {
        // Should not show create option for existing tag
        const createButtons = screen.queryAllByText(/「Bug」を作成/);
        expect(createButtons.length).toBe(0);
      });
    });
  });
});
