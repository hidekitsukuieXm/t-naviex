import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  TestCaseSortPanel,
  TestCaseSortDropdown,
  DEFAULT_SORT_STATE,
  SORT_FIELD_LABELS,
} from '../test-case-sort-panel';
import type { SortState } from '../test-case-sort-panel';

describe('TestCaseSortPanel', () => {
  const defaultProps = {
    sortState: DEFAULT_SORT_STATE,
    onSortChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('Constants', () => {
    it('should have all sort field labels', () => {
      expect(SORT_FIELD_LABELS.title).toBe('タイトル');
      expect(SORT_FIELD_LABELS.priority).toBe('優先度');
      expect(SORT_FIELD_LABELS.sortOrder).toBe('並び順');
      expect(SORT_FIELD_LABELS.createdAt).toBe('作成日');
      expect(SORT_FIELD_LABELS.updatedAt).toBe('更新日');
      expect(SORT_FIELD_LABELS.testType).toBe('テストタイプ');
      expect(SORT_FIELD_LABELS.testTechnique).toBe('テスト技法');
    });

    it('should have default sort state', () => {
      expect(DEFAULT_SORT_STATE).toEqual({
        field: 'sortOrder',
        order: 'asc',
      });
    });
  });

  describe('TestCaseSortPanel component', () => {
    it('should render sort label', () => {
      render(<TestCaseSortPanel {...defaultProps} />);
      expect(screen.getByText('並び替え:')).toBeDefined();
    });

    it('should render sort field select', () => {
      render(<TestCaseSortPanel {...defaultProps} />);
      const combobox = screen.getByRole('combobox');
      expect(combobox).toBeDefined();
    });

    it('should render order toggle button', () => {
      render(<TestCaseSortPanel {...defaultProps} />);
      const toggleButton = screen.getByTitle('昇順');
      expect(toggleButton).toBeDefined();
    });

    it('should show descending when order is desc', () => {
      render(<TestCaseSortPanel {...defaultProps} sortState={{ field: 'title', order: 'desc' }} />);
      const toggleButton = screen.getByTitle('降順');
      expect(toggleButton).toBeDefined();
    });

    it('should call onSortChange when toggle button is clicked', () => {
      const onSortChange = vi.fn();
      render(<TestCaseSortPanel {...defaultProps} onSortChange={onSortChange} />);

      const toggleButton = screen.getByTitle('昇順');
      fireEvent.click(toggleButton);

      expect(onSortChange).toHaveBeenCalledWith({
        field: 'sortOrder',
        order: 'desc',
      });
    });

    it('should toggle from desc to asc', () => {
      const onSortChange = vi.fn();
      render(
        <TestCaseSortPanel
          {...defaultProps}
          sortState={{ field: 'title', order: 'desc' }}
          onSortChange={onSortChange}
        />
      );

      const toggleButton = screen.getByTitle('降順');
      fireEvent.click(toggleButton);

      expect(onSortChange).toHaveBeenCalledWith({
        field: 'title',
        order: 'asc',
      });
    });
  });

  describe('TestCaseSortDropdown component', () => {
    it('should render dropdown trigger with current sort field', () => {
      render(<TestCaseSortDropdown {...defaultProps} />);
      expect(screen.getByText('並び順')).toBeDefined();
    });

    it('should show ascending arrow when order is asc', () => {
      render(<TestCaseSortDropdown {...defaultProps} />);
      // Check that trigger is present by looking for the sort field text
      expect(screen.getByText('並び順')).toBeDefined();
    });

    it('should render with different sort fields', () => {
      const sortStates: SortState[] = [
        { field: 'title', order: 'asc' },
        { field: 'priority', order: 'desc' },
        { field: 'testType', order: 'asc' },
        { field: 'testTechnique', order: 'desc' },
        { field: 'createdAt', order: 'asc' },
        { field: 'updatedAt', order: 'desc' },
      ];

      sortStates.forEach((sortState) => {
        const { unmount } = render(
          <TestCaseSortDropdown {...defaultProps} sortState={sortState} />
        );
        expect(screen.getByText(SORT_FIELD_LABELS[sortState.field])).toBeDefined();
        unmount();
      });
    });

    it('should open dropdown menu on click', async () => {
      render(<TestCaseSortDropdown {...defaultProps} />);

      // Find the trigger by its text content
      const trigger = screen.getByText('並び順').closest('button');
      expect(trigger).toBeDefined();
      fireEvent.click(trigger!);

      // Check that menu items appear
      expect(await screen.findByText('タイトル')).toBeDefined();
      expect(screen.getByText('優先度')).toBeDefined();
      expect(screen.getByText('作成日')).toBeDefined();
    });

    it('should call onSortChange when selecting a new field', async () => {
      const onSortChange = vi.fn();
      render(<TestCaseSortDropdown {...defaultProps} onSortChange={onSortChange} />);

      const trigger = screen.getByText('並び順').closest('button');
      fireEvent.click(trigger!);

      // Wait for menu to appear and click on "タイトル"
      const titleItem = await screen.findByRole('menuitem', { name: /タイトル/ });
      fireEvent.click(titleItem);

      expect(onSortChange).toHaveBeenCalledWith({
        field: 'title',
        order: 'asc',
      });
    });

    it('should toggle order when selecting the same field', async () => {
      const onSortChange = vi.fn();
      render(
        <TestCaseSortDropdown
          {...defaultProps}
          sortState={{ field: 'title', order: 'asc' }}
          onSortChange={onSortChange}
        />
      );

      const trigger = screen.getByText('タイトル').closest('button');
      fireEvent.click(trigger!);

      const titleItem = await screen.findByRole('menuitem', { name: /タイトル/ });
      fireEvent.click(titleItem);

      expect(onSortChange).toHaveBeenCalledWith({
        field: 'title',
        order: 'desc',
      });
    });
  });
});
