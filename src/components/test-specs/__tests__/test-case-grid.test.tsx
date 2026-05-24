import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import { TestCaseGrid } from '../test-case-grid';
import type { TestCase } from '@/types/test-case';

// Mock useRouter
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock clipboard API
const mockClipboard = {
  writeText: vi.fn().mockResolvedValue(undefined),
  readText: vi.fn().mockResolvedValue('Pasted Text'),
};
Object.assign(navigator, { clipboard: mockClipboard });

describe('TestCaseGrid', () => {
  const mockTestCases: TestCase[] = [
    {
      id: 'tc-1',
      testSpecId: 'spec-1',
      sectionId: null,
      title: 'Test Case 1',
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
      priority: 'HIGH',
      testType: 'FUNCTIONAL',
      testTechnique: 'OTHER',
      isMatrix: false,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-01T00:00:00.000Z',
    },
    {
      id: 'tc-2',
      testSpecId: 'spec-1',
      sectionId: null,
      title: 'Test Case 2',
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
      priority: 'MEDIUM',
      testType: 'INTEGRATION',
      testTechnique: 'OTHER',
      isMatrix: false,
      sortOrder: 1,
      createdAt: '2024-01-02T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
    },
  ];

  const mockApiResponse = {
    testCases: mockTestCases,
    total: 2,
    page: 1,
    limit: 50,
    totalPages: 1,
  };

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch.mockResolvedValue({
      ok: true,
      json: async () => mockApiResponse,
    });
  });

  it('should render grid with test cases', async () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('Test Case 1')).toBeDefined();
      expect(screen.getByText('Test Case 2')).toBeDefined();
    });
  });

  it('should show loading state initially', () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} />);

    // Loading state is shown before data loads
    expect(screen.getByText('テストケース一覧（グリッド）')).toBeDefined();
  });

  it('should show empty state when no test cases', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: async () => ({
        testCases: [],
        total: 0,
        page: 1,
        limit: 50,
        totalPages: 0,
      }),
    });

    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('テストケースがありません。')).toBeDefined();
    });
  });

  it('should show error state when fetch fails', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: async () => ({ error: 'Error message' }),
    });

    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('テストケース一覧の取得に失敗しました。')).toBeDefined();
    });
  });

  it('should render column headers', async () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('タイトル')).toBeDefined();
      expect(screen.getByText('優先度')).toBeDefined();
      expect(screen.getByText('テストタイプ')).toBeDefined();
      expect(screen.getByText('説明')).toBeDefined();
      expect(screen.getByText('更新日')).toBeDefined();
    });
  });

  it('should render priority badges', async () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('高')).toBeDefined();
      expect(screen.getByText('中')).toBeDefined();
    });
  });

  it('should render test type labels', async () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('機能テスト')).toBeDefined();
      expect(screen.getByText('結合テスト')).toBeDefined();
    });
  });

  it('should filter by search query', async () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('Test Case 1')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('タイトルで検索...');
    fireEvent.change(searchInput, { target: { value: 'search' } });

    // Wait for debounce (300ms) and check that API was called with query parameter
    await waitFor(
      () => {
        const calls = mockFetch.mock.calls;
        const lastCall = calls[calls.length - 1];
        expect(lastCall[0]).toContain('query=');
      },
      { timeout: 500 }
    );
  });

  it('should have priority filter select', async () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('Test Case 1')).toBeDefined();
    });

    // Check that filter controls are present
    const comboboxes = screen.getAllByRole('combobox');
    expect(comboboxes.length).toBeGreaterThanOrEqual(2);
  });

  it('should show keyboard shortcuts hint', async () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText(/Ctrl\+C コピー/)).toBeDefined();
      expect(screen.getByText(/Ctrl\+V ペースト/)).toBeDefined();
      expect(screen.getByText(/ダブルクリック\/Enter\/F2: 編集/)).toBeDefined();
      expect(screen.getByText(/矢印キー: セル移動/)).toBeDefined();
    });
  });

  it('should show total count', async () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} />);

    // Wait for data to load first
    await waitFor(() => {
      expect(screen.getByText('Test Case 1')).toBeDefined();
    });

    // Then check total count (may be in different format)
    await waitFor(() => {
      expect(screen.getByText(/2件/)).toBeDefined();
    });
  });

  it('should show new test case button when not locked', async () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} isLocked={false} />);

    await waitFor(() => {
      expect(screen.getByRole('button', { name: /新規テストケース/ })).toBeDefined();
    });
  });

  it('should hide new test case button when locked', async () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} isLocked={true} />);

    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /新規テストケース/ })).toBeNull();
    });
  });

  it('should clear filters when clear button is clicked', async () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('Test Case 1')).toBeDefined();
    });

    // Set a filter
    const searchInput = screen.getByPlaceholderText('タイトルで検索...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Wait for clear button to appear
    await waitFor(() => {
      expect(screen.getByRole('button', { name: /クリア/ })).toBeDefined();
    });

    // Click clear
    const clearButton = screen.getByRole('button', { name: /クリア/ });
    fireEvent.click(clearButton);

    // Search input should be cleared
    expect(searchInput).toHaveProperty('value', '');
  });

  it('should display edit hint in description', async () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} isLocked={false} />);

    await waitFor(() => {
      expect(screen.getByText(/ダブルクリックで編集、Ctrl\+C\/Vでコピー＆ペースト/)).toBeDefined();
    });
  });

  it('should enable editing on double click', async () => {
    render(<TestCaseGrid testSpecId="spec-1" selectedSectionId={null} />);

    await waitFor(() => {
      expect(screen.getByText('Test Case 1')).toBeDefined();
    });

    // Double-click to edit
    const titleCell = screen.getByText('Test Case 1');
    fireEvent.doubleClick(titleCell);

    // Check that an input appears
    await waitFor(() => {
      const inputs = screen.getAllByRole('textbox');
      // Should have at least the search input + edit input
      expect(inputs.length).toBeGreaterThanOrEqual(2);
    });
  });
});
