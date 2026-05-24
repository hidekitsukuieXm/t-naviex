import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Suspense } from 'react';
import TestSpecDetailPage from '../page';
import type { TestSpec } from '@/types/test-spec';
import type { TestSectionWithChildren } from '@/types/test-section';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock next/navigation
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    refresh: vi.fn(),
  }),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockTestSpec: TestSpec = {
  id: 'spec-1',
  projectId: 'project-1',
  name: 'テスト仕様書1',
  description: 'テスト仕様書の説明',
  status: 'DRAFT',
  version: '1.0.0',
  isLocked: false,
  createdAt: '2024-01-15T10:00:00.000Z',
  updatedAt: '2024-01-20T15:30:00.000Z',
};

const mockSections: TestSectionWithChildren[] = [
  {
    id: 'section-1',
    testSpecId: 'spec-1',
    parentId: null,
    name: 'セクション1',
    sortOrder: 0,
    createdAt: '2024-01-15T10:00:00.000Z',
    updatedAt: '2024-01-15T10:00:00.000Z',
    children: [],
  },
];

const mockTestCasesResponse = {
  testCases: [
    {
      id: 'case-1',
      testSpecId: 'spec-1',
      sectionId: 'section-1',
      title: 'テストケース1',
      description: 'テストケースの説明',
      preconditions: null,
      priority: 'HIGH',
      testType: 'FUNCTIONAL',
      testTechnique: 'EQUIVALENCE_PARTITIONING',
      isMatrix: false,
      sortOrder: 0,
      createdAt: '2024-01-15T10:00:00.000Z',
      updatedAt: '2024-01-20T15:30:00.000Z',
    },
  ],
  total: 1,
  page: 1,
  limit: 20,
  totalPages: 1,
};

// Wrapper component with Suspense for testing
function TestWrapper({ children }: { children: React.ReactNode }) {
  return <Suspense fallback={<div>Loading...</div>}>{children}</Suspense>;
}

function setupMockFetch() {
  mockFetch.mockImplementation((url: string) => {
    // Order matters - check more specific URLs first
    if (url.includes('/sections')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ sections: mockSections }),
      });
    }
    if (url.includes('/cases')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTestCasesResponse),
      });
    }
    if (url.includes('/api/test-specs/spec-1')) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve(mockTestSpec),
      });
    }
    return Promise.resolve({
      ok: false,
      json: () => Promise.resolve({ error: 'Not found' }),
    });
  });
}

describe('TestSpecDetailPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    setupMockFetch();
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  it('should fetch test spec on mount', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <TestSpecDetailPage params={Promise.resolve({ id: 'project-1', specId: 'spec-1' })} />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/test-specs/spec-1');
    });
  });

  it('should fetch sections on mount', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <TestSpecDetailPage params={Promise.resolve({ id: 'project-1', specId: 'spec-1' })} />
        </TestWrapper>
      );
    });

    await waitFor(() => {
      expect(mockFetch).toHaveBeenCalledWith('/api/test-specs/spec-1/sections?format=tree');
    });
  });

  it('should render test spec header after loading', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <TestSpecDetailPage params={Promise.resolve({ id: 'project-1', specId: 'spec-1' })} />
        </TestWrapper>
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText('テスト仕様書1')).toBeDefined();
      },
      { timeout: 5000 }
    );
  });

  it('should render section tree after loading', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <TestSpecDetailPage params={Promise.resolve({ id: 'project-1', specId: 'spec-1' })} />
        </TestWrapper>
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText('セクション1')).toBeDefined();
      },
      { timeout: 5000 }
    );
  });

  it('should render error state when test spec fetch fails', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/sections')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ sections: [] }),
        });
      }
      if (url.includes('/api/test-specs/spec-1')) {
        return Promise.resolve({
          ok: false,
          status: 404,
          json: () => Promise.resolve({ error: 'Not found' }),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Error' }),
      });
    });

    await act(async () => {
      render(
        <TestWrapper>
          <TestSpecDetailPage params={Promise.resolve({ id: 'project-1', specId: 'spec-1' })} />
        </TestWrapper>
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText('テスト仕様書が見つかりません。')).toBeDefined();
      },
      { timeout: 5000 }
    );
  });

  it('should render error state when sections fetch fails', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/sections')) {
        return Promise.resolve({
          ok: false,
          json: () => Promise.resolve({ error: 'Error' }),
        });
      }
      if (url.includes('/api/test-specs/spec-1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTestSpec),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Error' }),
      });
    });

    await act(async () => {
      render(
        <TestWrapper>
          <TestSpecDetailPage params={Promise.resolve({ id: 'project-1', specId: 'spec-1' })} />
        </TestWrapper>
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText('セクション一覧の取得に失敗しました。')).toBeDefined();
      },
      { timeout: 5000 }
    );
  });

  it('should render back link to test specs list', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <TestSpecDetailPage params={Promise.resolve({ id: 'project-1', specId: 'spec-1' })} />
        </TestWrapper>
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText('テスト仕様書一覧に戻る')).toBeDefined();
      },
      { timeout: 5000 }
    );

    const backLink = screen.getByText('テスト仕様書一覧に戻る').closest('a');
    expect(backLink?.getAttribute('href')).toBe('/projects/project-1/test-specs');
  });

  it('should render edit link', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <TestSpecDetailPage params={Promise.resolve({ id: 'project-1', specId: 'spec-1' })} />
        </TestWrapper>
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText('編集')).toBeDefined();
      },
      { timeout: 5000 }
    );

    const editLink = screen.getByText('編集').closest('a');
    expect(editLink?.getAttribute('href')).toBe('/projects/project-1/test-specs/spec-1/edit');
  });

  it('should render version info', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <TestSpecDetailPage params={Promise.resolve({ id: 'project-1', specId: 'spec-1' })} />
        </TestWrapper>
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText(/v1\.0\.0/)).toBeDefined();
      },
      { timeout: 5000 }
    );
  });

  it('should render status badge', async () => {
    await act(async () => {
      render(
        <TestWrapper>
          <TestSpecDetailPage params={Promise.resolve({ id: 'project-1', specId: 'spec-1' })} />
        </TestWrapper>
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText('下書き')).toBeDefined();
      },
      { timeout: 5000 }
    );
  });

  it('should render "全てのテストケース" option in section tree', async () => {
    // Reset the mock to ensure proper setup
    setupMockFetch();

    await act(async () => {
      render(
        <TestWrapper>
          <TestSpecDetailPage params={Promise.resolve({ id: 'project-1', specId: 'spec-1' })} />
        </TestWrapper>
      );
    });

    // First wait for the spec name to appear (which confirms loading is done)
    await waitFor(
      () => {
        expect(screen.getByText('テスト仕様書1')).toBeDefined();
      },
      { timeout: 5000 }
    );

    // Then check for the section tree option (multiple elements with this text exist)
    const elements = screen.getAllByText('全てのテストケース');
    expect(elements.length).toBeGreaterThan(0);
  });

  it('should handle empty sections', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/sections')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ sections: [] }),
        });
      }
      if (url.includes('/cases')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTestCasesResponse),
        });
      }
      if (url.includes('/api/test-specs/spec-1')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTestSpec),
        });
      }
      return Promise.resolve({
        ok: false,
        json: () => Promise.resolve({ error: 'Not found' }),
      });
    });

    await act(async () => {
      render(
        <TestWrapper>
          <TestSpecDetailPage params={Promise.resolve({ id: 'project-1', specId: 'spec-1' })} />
        </TestWrapper>
      );
    });

    await waitFor(
      () => {
        expect(screen.getByText('セクションがありません。')).toBeDefined();
      },
      { timeout: 5000 }
    );
  });
});
