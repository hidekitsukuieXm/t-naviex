import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, waitFor, act } from '@testing-library/react';
import { Suspense } from 'react';
import GanttPage from '../page';

// Mock next/navigation
const mockPush = vi.fn();
vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    back: vi.fn(),
    forward: vi.fn(),
    refresh: vi.fn(),
    replace: vi.fn(),
    prefetch: vi.fn(),
  }),
}));

// Mock sonner toast
vi.mock('sonner', () => ({
  toast: {
    success: vi.fn(),
    error: vi.fn(),
    info: vi.fn(),
  },
}));

// Mock GanttChart component
vi.mock('@/components/gantt/gantt-chart', () => ({
  GanttChart: vi.fn(({ tasks, milestones }) => (
    <div data-testid="gantt-chart">
      <div data-testid="tasks-count">{tasks.length}</div>
      <div data-testid="milestones-count">{milestones.length}</div>
    </div>
  )),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Helper to render with Suspense
function renderWithSuspense(component: React.ReactNode) {
  return render(<Suspense fallback={<div>Loading...</div>}>{component}</Suspense>);
}

describe('GanttPage', () => {
  const mockTasks = [
    {
      id: '1',
      projectId: '100',
      parentId: null,
      title: 'Task 1',
      description: null,
      status: 'IN_PROGRESS',
      priority: 'MEDIUM',
      assigneeId: null,
      startDate: '2024-01-01',
      endDate: '2024-01-15',
      progress: 50,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
    {
      id: '2',
      projectId: '100',
      parentId: null,
      title: 'Task 2',
      description: null,
      status: 'NOT_STARTED',
      priority: 'HIGH',
      assigneeId: null,
      startDate: null,
      endDate: null,
      progress: 0,
      sortOrder: 1,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  const mockMilestones = [
    {
      id: '1',
      projectId: '100',
      name: 'Milestone 1',
      description: null,
      status: 'PLANNED',
      startDate: null,
      dueDate: '2024-01-31',
      completedAt: null,
      sortOrder: 0,
      createdAt: '2024-01-01T00:00:00Z',
      updatedAt: '2024-01-01T00:00:00Z',
    },
  ];

  beforeEach(() => {
    vi.clearAllMocks();
  });

  it('should render page title after data loads', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTasks),
        });
      }
      if (url.includes('/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMilestones),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await act(async () => {
      renderWithSuspense(<GanttPage params={Promise.resolve({ id: '100' })} />);
    });

    await waitFor(
      () => {
        expect(screen.getByText('ガントチャート')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should fetch tasks and milestones on mount', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTasks),
        });
      }
      if (url.includes('/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMilestones),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await act(async () => {
      renderWithSuspense(<GanttPage params={Promise.resolve({ id: '100' })} />);
    });

    await waitFor(
      () => {
        expect(mockFetch).toHaveBeenCalledWith('/api/projects/100/tasks');
        expect(mockFetch).toHaveBeenCalledWith('/api/projects/100/milestones');
      },
      { timeout: 3000 }
    );
  });

  it('should render GanttChart with tasks and milestones', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTasks),
        });
      }
      if (url.includes('/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMilestones),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await act(async () => {
      renderWithSuspense(<GanttPage params={Promise.resolve({ id: '100' })} />);
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByTestId('tasks-count')).toHaveTextContent('2');
    expect(screen.getByTestId('milestones-count')).toHaveTextContent('1');
  });

  it('should display statistics cards', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTasks),
        });
      }
      if (url.includes('/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMilestones),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await act(async () => {
      renderWithSuspense(<GanttPage params={Promise.resolve({ id: '100' })} />);
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByText('総タスク数')).toBeInTheDocument();
    expect(screen.getByText('日程設定済みタスク')).toBeInTheDocument();
    expect(screen.getByText('マイルストーン数')).toBeInTheDocument();
    expect(screen.getByText('期限設定済みマイルストーン')).toBeInTheDocument();
  });

  it('should show error state when tasks fetch fails', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/tasks')) {
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      }
      if (url.includes('/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMilestones),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await act(async () => {
      renderWithSuspense(<GanttPage params={Promise.resolve({ id: '100' })} />);
    });

    await waitFor(
      () => {
        expect(screen.getByText('タスクの取得に失敗しました。')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should show error state when milestones fetch fails', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTasks),
        });
      }
      if (url.includes('/milestones')) {
        return Promise.resolve({
          ok: false,
          status: 500,
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await act(async () => {
      renderWithSuspense(<GanttPage params={Promise.resolve({ id: '100' })} />);
    });

    await waitFor(
      () => {
        expect(screen.getByText('マイルストーンの取得に失敗しました。')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });

  it('should handle empty tasks and milestones', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      if (url.includes('/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await act(async () => {
      renderWithSuspense(<GanttPage params={Promise.resolve({ id: '100' })} />);
    });

    await waitFor(
      () => {
        expect(screen.getByTestId('gantt-chart')).toBeInTheDocument();
      },
      { timeout: 3000 }
    );

    expect(screen.getByTestId('tasks-count')).toHaveTextContent('0');
    expect(screen.getByTestId('milestones-count')).toHaveTextContent('0');
  });

  it('should display page description', async () => {
    mockFetch.mockImplementation((url: string) => {
      if (url.includes('/tasks')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockTasks),
        });
      }
      if (url.includes('/milestones')) {
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockMilestones),
        });
      }
      return Promise.reject(new Error('Unknown URL'));
    });

    await act(async () => {
      renderWithSuspense(<GanttPage params={Promise.resolve({ id: '100' })} />);
    });

    await waitFor(
      () => {
        expect(
          screen.getByText('プロジェクトのタスクとマイルストーンを時系列で表示')
        ).toBeInTheDocument();
      },
      { timeout: 3000 }
    );
  });
});
