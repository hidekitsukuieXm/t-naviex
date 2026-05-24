import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestCaseList, TestCasePriorityBadge } from '../test-case-list';
import type { TestCaseListResponse } from '@/types/test-case';

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockTestCasesResponse: TestCaseListResponse = {
  testCases: [
    {
      id: 'case-1',
      testSpecId: 'spec-1',
      sectionId: 'section-1',
      title: 'テストケース1',
      description: 'テストケースの説明',
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
      testType: 'FUNCTIONAL',
      testTechnique: 'EQUIVALENCE_PARTITIONING',
      isMatrix: false,
      sortOrder: 0,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-20T15:30:00.000Z',
    },
    {
      id: 'case-2',
      testSpecId: 'spec-1',
      sectionId: 'section-1',
      title: 'テストケース2',
      description: null,
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
      priority: 'CRITICAL',
      testType: 'E2E',
      testTechnique: 'BOUNDARY_VALUE_ANALYSIS',
      isMatrix: false,
      sortOrder: 1,
      createdAt: '2024-01-16T10:00:00.000Z',
      updatedAt: '2024-01-21T15:30:00.000Z',
    },
  ],
  total: 2,
  page: 1,
  limit: 20,
  totalPages: 1,
};

describe('TestCasePriorityBadge', () => {
  it('should render CRITICAL priority', () => {
    render(<TestCasePriorityBadge priority="CRITICAL" />);
    expect(screen.getByText('致命的')).toBeDefined();
  });

  it('should render HIGH priority', () => {
    render(<TestCasePriorityBadge priority="HIGH" />);
    expect(screen.getByText('高')).toBeDefined();
  });

  it('should render MEDIUM priority', () => {
    render(<TestCasePriorityBadge priority="MEDIUM" />);
    expect(screen.getByText('中')).toBeDefined();
  });

  it('should render LOW priority', () => {
    render(<TestCasePriorityBadge priority="LOW" />);
    expect(screen.getByText('低')).toBeDefined();
  });
});

describe('TestCaseList', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockTestCasesResponse),
    });
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should render loading state initially', () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);
    // Loading state shows spinner
    expect(document.querySelector('.animate-spin')).not.toBeNull();
  });

  it('should fetch test cases on mount', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(
        expect.stringContaining('/api/test-specs/spec-1/cases')
      );
    });
  });

  it('should render test cases after loading', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('テストケース1')).toBeDefined();
      expect(screen.getByText('テストケース2')).toBeDefined();
    });
  });

  it('should render test case description', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('テストケースの説明')).toBeDefined();
    });
  });

  it('should render priority badges', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('高')).toBeDefined();
      expect(screen.getByText('致命的')).toBeDefined();
    });
  });

  it('should render test type labels', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('機能テスト')).toBeDefined();
      expect(screen.getByText('E2Eテスト')).toBeDefined();
    });
  });

  it('should show total count', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('2件のテストケース')).toBeDefined();
    });
  });

  it('should render empty state when no test cases', async () => {
    mockFetch.mockResolvedValue({
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

    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('テストケースがありません。')).toBeDefined();
    });
  });

  it('should render error state on fetch failure', async () => {
    mockFetch.mockResolvedValue({
      ok: false,
      json: () => Promise.resolve({ error: 'Error' }),
    });

    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('テストケース一覧の取得に失敗しました。')).toBeDefined();
    });
  });

  it('should include sectionId in fetch when provided', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId="section-1" />);

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith(expect.stringContaining('sectionId=section-1'));
    });
  });

  it('should render search input', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('タイトルで検索...')).toBeDefined();
    });
  });

  it('should render priority filter', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      // Check for priority filter trigger (it will show "全て" initially)
      const triggers = screen.getAllByRole('combobox');
      expect(triggers.length).toBeGreaterThan(0);
    });
  });

  it('should render clear filters button when filters are applied', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('タイトルで検索...')).toBeDefined();
    });

    // Apply filter
    fireEvent.change(screen.getByPlaceholderText('タイトルで検索...'), {
      target: { value: 'test' },
    });

    await waitFor(() => {
      expect(screen.getByText('クリア')).toBeDefined();
    });
  });

  it('should clear filters when clicking clear button', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByPlaceholderText('タイトルで検索...')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('タイトルで検索...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    await waitFor(() => {
      expect(screen.getByText('クリア')).toBeDefined();
    });

    fireEvent.click(screen.getByText('クリア'));

    expect((searchInput as HTMLInputElement).value).toBe('');
  });

  it('should render sortable column headers', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('タイトル')).toBeDefined();
      expect(screen.getByText('優先度')).toBeDefined();
      expect(screen.getByText('テストタイプ')).toBeDefined();
      expect(screen.getByText('更新日')).toBeDefined();
    });
  });

  it('should apply custom className', async () => {
    const { container } = render(
      <TestCaseList testSpecId="spec-1" selectedSectionId={null} className="custom-class" />
    );

    // Check if the card has the custom class
    expect(container.querySelector('.custom-class')).not.toBeNull();
  });

  it('should render pagination when there are multiple pages', async () => {
    mockFetch.mockResolvedValue({
      ok: true,
      json: () =>
        Promise.resolve({
          testCases: mockTestCasesResponse.testCases,
          total: 50,
          page: 1,
          limit: 20,
          totalPages: 3,
        }),
    });

    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('前へ')).toBeDefined();
      expect(screen.getByText('次へ')).toBeDefined();
      expect(screen.getByText('1 / 3')).toBeDefined();
    });
  });

  it('should not render pagination when there is only one page', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('テストケース1')).toBeDefined();
    });

    expect(screen.queryByText('前へ')).toBeNull();
    expect(screen.queryByText('次へ')).toBeNull();
  });

  it('should show "全てのテストケース" when selectedSectionId is null', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('全てのテストケース')).toBeDefined();
    });
  });

  it('should show "テストケース" when selectedSectionId is provided', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId="section-1" />);

    await waitFor(() => {
      // The title should be "テストケース" not "全てのテストケース"
      expect(screen.queryByText('全てのテストケース')).toBeNull();
      expect(screen.getByText('テストケース')).toBeDefined();
    });
  });

  it('should render table rows as clickable', async () => {
    render(<TestCaseList testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      const rows = document.querySelectorAll('tbody tr');
      rows.forEach((row) => {
        expect(row.className).toContain('cursor-pointer');
      });
    });
  });
});
