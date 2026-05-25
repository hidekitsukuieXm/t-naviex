import { describe, it, expect, vi } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import {
  TestCaseFilterPanel,
  DEFAULT_FILTER_STATE,
  hasActiveFilters,
  countActiveFilters,
} from '../test-case-filter-panel';
import type { TestCaseFilterState } from '@/types/test-case';

describe('TestCaseFilterPanel', () => {
  const defaultProps = {
    filters: DEFAULT_FILTER_STATE,
    onFilterChange: vi.fn(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('hasActiveFilters', () => {
    it('should return false for default state', () => {
      expect(hasActiveFilters(DEFAULT_FILTER_STATE)).toBe(false);
    });

    it('should return true when query is set', () => {
      expect(hasActiveFilters({ ...DEFAULT_FILTER_STATE, query: 'test' })).toBe(true);
    });

    it('should return true when priority is set', () => {
      expect(hasActiveFilters({ ...DEFAULT_FILTER_STATE, priority: 'HIGH' })).toBe(true);
    });

    it('should return true when testType is set', () => {
      expect(hasActiveFilters({ ...DEFAULT_FILTER_STATE, testType: 'FUNCTIONAL' })).toBe(true);
    });

    it('should return true when testTechnique is set', () => {
      expect(
        hasActiveFilters({ ...DEFAULT_FILTER_STATE, testTechnique: 'BOUNDARY_VALUE_ANALYSIS' })
      ).toBe(true);
    });

    it('should return true when tags are set', () => {
      expect(hasActiveFilters({ ...DEFAULT_FILTER_STATE, tags: ['tag1'] })).toBe(true);
    });

    it('should return true when classification is set', () => {
      expect(hasActiveFilters({ ...DEFAULT_FILTER_STATE, classification: 'category' })).toBe(true);
    });

    it('should return true when isMatrix is set', () => {
      expect(hasActiveFilters({ ...DEFAULT_FILTER_STATE, isMatrix: true })).toBe(true);
    });
  });

  describe('countActiveFilters', () => {
    it('should return 0 for default state', () => {
      expect(countActiveFilters(DEFAULT_FILTER_STATE)).toBe(0);
    });

    it('should count query filter', () => {
      expect(countActiveFilters({ ...DEFAULT_FILTER_STATE, query: 'test' })).toBe(1);
    });

    it('should count multiple filters', () => {
      const filters: TestCaseFilterState = {
        query: 'test',
        priority: 'HIGH',
        testType: 'FUNCTIONAL',
        testTechnique: 'all',
        tags: ['tag1', 'tag2'],
        classification: 'category',
        isMatrix: true,
      };
      // query(1) + priority(1) + testType(1) + tags(1) + classification(1) + isMatrix(1) = 6
      expect(countActiveFilters(filters)).toBe(6);
    });
  });

  describe('Component rendering', () => {
    it('should render search input', () => {
      render(<TestCaseFilterPanel {...defaultProps} />);
      expect(screen.getByPlaceholderText('タイトルで検索...')).toBeDefined();
    });

    it('should render priority filter', () => {
      render(<TestCaseFilterPanel {...defaultProps} />);
      const comboboxes = screen.getAllByRole('combobox');
      expect(comboboxes.length).toBeGreaterThanOrEqual(2);
    });

    it('should render advanced filter button', () => {
      render(<TestCaseFilterPanel {...defaultProps} />);
      expect(screen.getByText('詳細フィルター')).toBeDefined();
    });

    it('should not show clear button when no filters are active', () => {
      render(<TestCaseFilterPanel {...defaultProps} />);
      expect(screen.queryByText('クリア')).toBeNull();
    });

    it('should show clear button when filters are active', () => {
      render(
        <TestCaseFilterPanel
          {...defaultProps}
          filters={{ ...DEFAULT_FILTER_STATE, query: 'test' }}
        />
      );
      expect(screen.getByRole('button', { name: /クリア/ })).toBeDefined();
    });
  });

  describe('Filter interactions', () => {
    it('should call onFilterChange when search query changes', async () => {
      const onFilterChange = vi.fn();
      render(<TestCaseFilterPanel {...defaultProps} onFilterChange={onFilterChange} />);

      const searchInput = screen.getByPlaceholderText('タイトルで検索...');
      fireEvent.change(searchInput, { target: { value: 'test query' } });

      expect(onFilterChange).toHaveBeenCalledWith(expect.objectContaining({ query: 'test query' }));
    });

    it('should call onFilterChange when clear button is clicked', async () => {
      const onFilterChange = vi.fn();
      render(
        <TestCaseFilterPanel
          {...defaultProps}
          onFilterChange={onFilterChange}
          filters={{ ...DEFAULT_FILTER_STATE, query: 'test' }}
        />
      );

      const clearButton = screen.getByRole('button', { name: /クリア/ });
      fireEvent.click(clearButton);

      expect(onFilterChange).toHaveBeenCalledWith(DEFAULT_FILTER_STATE);
    });
  });

  describe('Active filters display', () => {
    it('should display active search query', () => {
      render(
        <TestCaseFilterPanel
          {...defaultProps}
          filters={{ ...DEFAULT_FILTER_STATE, query: 'test query' }}
        />
      );

      expect(screen.getByText('フィルター中:')).toBeDefined();
      expect(screen.getByText(/検索: test query/)).toBeDefined();
    });

    it('should display active priority filter', () => {
      render(
        <TestCaseFilterPanel
          {...defaultProps}
          filters={{ ...DEFAULT_FILTER_STATE, priority: 'HIGH' }}
        />
      );

      expect(screen.getByText(/優先度: 高/)).toBeDefined();
    });

    it('should display active test type filter', () => {
      render(
        <TestCaseFilterPanel
          {...defaultProps}
          filters={{ ...DEFAULT_FILTER_STATE, testType: 'FUNCTIONAL' }}
        />
      );

      expect(screen.getByText(/タイプ: 機能テスト/)).toBeDefined();
    });

    it('should display active tags', () => {
      render(
        <TestCaseFilterPanel
          {...defaultProps}
          filters={{ ...DEFAULT_FILTER_STATE, tags: ['tag1', 'tag2'] }}
        />
      );

      expect(screen.getByText(/タグ: tag1/)).toBeDefined();
      expect(screen.getByText(/タグ: tag2/)).toBeDefined();
    });
  });

  describe('Available tags', () => {
    it('should render available tags for selection', async () => {
      render(
        <TestCaseFilterPanel
          {...defaultProps}
          availableTags={['existing-tag-1', 'existing-tag-2']}
        />
      );

      // Open advanced filter popover
      const advancedButton = screen.getByText('詳細フィルター');
      fireEvent.click(advancedButton);

      // Wait for popover to open
      await waitFor(() => {
        expect(screen.getByText('既存のタグから選択')).toBeDefined();
      });
    });
  });
});
