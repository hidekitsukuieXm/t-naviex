import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent } from '@testing-library/react';
import {
  ColumnVisibilityDialog,
  GRID_COLUMN_LABELS,
  DEFAULT_COLUMN_VISIBILITY,
  COLUMN_VISIBILITY_STORAGE_KEY,
  loadColumnVisibility,
  saveColumnVisibility,
  type ColumnConfig,
} from '../column-visibility-dialog';
import type { VisibilityState } from '@tanstack/react-table';

describe('ColumnVisibilityDialog', () => {
  const mockColumns: ColumnConfig[] = [
    { id: 'title', label: 'タイトル', canHide: false },
    { id: 'priority', label: '優先度', canHide: true },
    { id: 'testType', label: 'テストタイプ', canHide: true },
    { id: 'description', label: '説明', canHide: true },
    { id: 'updatedAt', label: '更新日', canHide: true },
  ];

  const defaultProps = {
    columns: mockColumns,
    columnVisibility: DEFAULT_COLUMN_VISIBILITY,
    onColumnVisibilityChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorage.clear();
  });

  afterEach(() => {
    localStorage.clear();
  });

  describe('Constants', () => {
    it('should have all grid column labels', () => {
      expect(GRID_COLUMN_LABELS.title).toBe('タイトル');
      expect(GRID_COLUMN_LABELS.priority).toBe('優先度');
      expect(GRID_COLUMN_LABELS.testType).toBe('テストタイプ');
      expect(GRID_COLUMN_LABELS.description).toBe('説明');
      expect(GRID_COLUMN_LABELS.updatedAt).toBe('更新日');
    });

    it('should have default column visibility', () => {
      expect(DEFAULT_COLUMN_VISIBILITY).toEqual({
        title: true,
        priority: true,
        testType: true,
        description: true,
        updatedAt: true,
      });
    });

    it('should have storage key', () => {
      expect(COLUMN_VISIBILITY_STORAGE_KEY).toBe('test-case-grid-column-visibility');
    });
  });

  describe('Helper functions', () => {
    describe('loadColumnVisibility', () => {
      it('should return default visibility when localStorage is empty', () => {
        const visibility = loadColumnVisibility();
        expect(visibility).toEqual(DEFAULT_COLUMN_VISIBILITY);
      });

      it('should load visibility from localStorage', () => {
        const customVisibility: VisibilityState = {
          title: true,
          priority: false,
          testType: true,
          description: false,
          updatedAt: true,
        };
        localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, JSON.stringify(customVisibility));

        const visibility = loadColumnVisibility();
        expect(visibility).toEqual(customVisibility);
      });

      it('should return default visibility when localStorage has invalid JSON', () => {
        localStorage.setItem(COLUMN_VISIBILITY_STORAGE_KEY, 'invalid-json');

        const visibility = loadColumnVisibility();
        expect(visibility).toEqual(DEFAULT_COLUMN_VISIBILITY);
      });
    });

    describe('saveColumnVisibility', () => {
      it('should save visibility to localStorage', () => {
        const customVisibility: VisibilityState = {
          title: true,
          priority: false,
        };

        saveColumnVisibility(customVisibility);

        const stored = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
        expect(stored).toBe(JSON.stringify(customVisibility));
      });
    });
  });

  describe('ColumnVisibilityDialog component', () => {
    it('should render dialog trigger', () => {
      render(<ColumnVisibilityDialog {...defaultProps} />);
      expect(screen.getByText('表示列設定')).toBeDefined();
    });

    it('should render custom trigger when provided', () => {
      render(<ColumnVisibilityDialog {...defaultProps} trigger={<span>カスタムトリガー</span>} />);
      expect(screen.getByText('カスタムトリガー')).toBeDefined();
    });

    it('should open dialog when trigger is clicked', async () => {
      render(<ColumnVisibilityDialog {...defaultProps} />);

      const trigger = screen.getByText('表示列設定');
      fireEvent.click(trigger);

      // Dialog should be open and show the title
      expect(await screen.findByRole('dialog')).toBeDefined();
      expect(
        screen.getByText('テーブルに表示する列を選択してください。（5/5列表示中）')
      ).toBeDefined();
    });

    it('should display all column labels in dialog', async () => {
      render(<ColumnVisibilityDialog {...defaultProps} />);

      const trigger = screen.getByText('表示列設定');
      fireEvent.click(trigger);

      await screen.findByRole('dialog');

      // All columns should be listed
      expect(screen.getByText('タイトル')).toBeDefined();
      expect(screen.getByText('優先度')).toBeDefined();
      expect(screen.getByText('テストタイプ')).toBeDefined();
      expect(screen.getByText('説明')).toBeDefined();
      expect(screen.getByText('更新日')).toBeDefined();
    });

    it('should show required label for non-hideable columns', async () => {
      render(<ColumnVisibilityDialog {...defaultProps} />);

      const trigger = screen.getByText('表示列設定');
      fireEvent.click(trigger);

      await screen.findByRole('dialog');

      // "必須" label should appear for title column
      expect(screen.getByText('必須')).toBeDefined();
    });

    it('should have disabled checkbox for non-hideable columns', async () => {
      render(<ColumnVisibilityDialog {...defaultProps} />);

      const trigger = screen.getByText('表示列設定');
      fireEvent.click(trigger);

      await screen.findByRole('dialog');

      // Find the checkbox for the title column (non-hideable)
      const titleCheckbox = screen.getByRole('checkbox', { name: /タイトルを非表示にする/ });
      expect(titleCheckbox).toHaveProperty('disabled', true);
    });

    it('should toggle column visibility when checkbox is clicked', async () => {
      const onColumnVisibilityChange = vi.fn();
      render(
        <ColumnVisibilityDialog
          {...defaultProps}
          onColumnVisibilityChange={onColumnVisibilityChange}
        />
      );

      const trigger = screen.getByText('表示列設定');
      fireEvent.click(trigger);

      await screen.findByRole('dialog');

      // Find and click the checkbox for priority column (hideable)
      const priorityCheckbox = screen.getByRole('checkbox', { name: /優先度を非表示にする/ });
      fireEvent.click(priorityCheckbox);

      expect(onColumnVisibilityChange).toHaveBeenCalledWith({
        ...DEFAULT_COLUMN_VISIBILITY,
        priority: false,
      });
    });

    it('should show all columns when "全て表示" is clicked', async () => {
      const onColumnVisibilityChange = vi.fn();
      const partialVisibility: VisibilityState = {
        title: true,
        priority: false,
        testType: false,
        description: true,
        updatedAt: true,
      };

      render(
        <ColumnVisibilityDialog
          {...defaultProps}
          columnVisibility={partialVisibility}
          onColumnVisibilityChange={onColumnVisibilityChange}
        />
      );

      const trigger = screen.getByText('表示列設定');
      fireEvent.click(trigger);

      await screen.findByRole('dialog');

      const showAllButton = screen.getByRole('button', { name: '全て表示' });
      fireEvent.click(showAllButton);

      expect(onColumnVisibilityChange).toHaveBeenCalledWith({
        title: true,
        priority: true,
        testType: true,
        description: true,
        updatedAt: true,
      });
    });

    it('should hide optional columns when "最小表示" is clicked', async () => {
      const onColumnVisibilityChange = vi.fn();

      render(
        <ColumnVisibilityDialog
          {...defaultProps}
          onColumnVisibilityChange={onColumnVisibilityChange}
        />
      );

      const trigger = screen.getByText('表示列設定');
      fireEvent.click(trigger);

      await screen.findByRole('dialog');

      const hideOptionalButton = screen.getByRole('button', { name: '最小表示' });
      fireEvent.click(hideOptionalButton);

      // Only non-hideable columns (title) should be visible
      expect(onColumnVisibilityChange).toHaveBeenCalledWith({
        title: true,
        priority: false,
        testType: false,
        description: false,
        updatedAt: false,
      });
    });

    it('should reset to default when "デフォルトに戻す" is clicked', async () => {
      const onColumnVisibilityChange = vi.fn();
      const onReset = vi.fn();
      const customVisibility: VisibilityState = {
        title: true,
        priority: false,
        testType: false,
        description: false,
        updatedAt: false,
      };

      render(
        <ColumnVisibilityDialog
          {...defaultProps}
          columnVisibility={customVisibility}
          onColumnVisibilityChange={onColumnVisibilityChange}
          onReset={onReset}
        />
      );

      const trigger = screen.getByText('表示列設定');
      fireEvent.click(trigger);

      await screen.findByRole('dialog');

      const resetButton = screen.getByRole('button', { name: /デフォルトに戻す/ });
      fireEvent.click(resetButton);

      expect(onColumnVisibilityChange).toHaveBeenCalledWith(DEFAULT_COLUMN_VISIBILITY);
      expect(onReset).toHaveBeenCalled();
    });

    it('should display correct visible column count', async () => {
      const partialVisibility: VisibilityState = {
        title: true,
        priority: true,
        testType: false,
        description: false,
        updatedAt: true,
      };

      render(<ColumnVisibilityDialog {...defaultProps} columnVisibility={partialVisibility} />);

      const trigger = screen.getByText('表示列設定');
      fireEvent.click(trigger);

      await screen.findByRole('dialog');

      // 3 columns are visible out of 5
      expect(
        screen.getByText('テーブルに表示する列を選択してください。（3/5列表示中）')
      ).toBeDefined();
    });

    it('should save to localStorage when column visibility changes', async () => {
      const onColumnVisibilityChange = vi.fn();
      render(
        <ColumnVisibilityDialog
          {...defaultProps}
          onColumnVisibilityChange={onColumnVisibilityChange}
        />
      );

      const trigger = screen.getByText('表示列設定');
      fireEvent.click(trigger);

      await screen.findByRole('dialog');

      const priorityCheckbox = screen.getByRole('checkbox', { name: /優先度を非表示にする/ });
      fireEvent.click(priorityCheckbox);

      // Verify localStorage was updated
      const stored = localStorage.getItem(COLUMN_VISIBILITY_STORAGE_KEY);
      expect(stored).toBeDefined();
      expect(JSON.parse(stored!)).toEqual({
        ...DEFAULT_COLUMN_VISIBILITY,
        priority: false,
      });
    });

    it('should close dialog when close button is clicked', async () => {
      render(<ColumnVisibilityDialog {...defaultProps} />);

      const trigger = screen.getByText('表示列設定');
      fireEvent.click(trigger);

      await screen.findByRole('dialog');

      const closeButton = screen.getByRole('button', { name: '閉じる' });
      fireEvent.click(closeButton);

      // Dialog should be closed (no longer present)
      // Wait for dialog to close
      await new Promise((resolve) => setTimeout(resolve, 100));
      expect(screen.queryByRole('dialog')).toBeNull();
    });

    it('should apply custom className', () => {
      render(<ColumnVisibilityDialog {...defaultProps} className="custom-class" />);

      const trigger = screen.getByText('表示列設定').closest('button');
      expect(trigger?.className).toContain('custom-class');
    });
  });
});
