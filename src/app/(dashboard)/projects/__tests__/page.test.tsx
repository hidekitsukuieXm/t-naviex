import { describe, it, expect, vi, beforeEach } from 'vitest';
import { render, screen, fireEvent, waitFor } from '@testing-library/react';
import ProjectsPage, { clearProjectsCache } from '../page';
import type { ProjectListResponse } from '@/types/project';

// Mock next/link
vi.mock('next/link', () => ({
  default: ({ children, href }: { children: React.ReactNode; href: string }) => (
    <a href={href}>{children}</a>
  ),
}));

// Mock ProjectCreateDialog
vi.mock('@/components/projects/project-create-dialog', () => ({
  ProjectCreateDialog: ({ onSuccess }: { onSuccess: () => void }) => (
    <button onClick={onSuccess} data-testid="create-project-btn">
      新規プロジェクト
    </button>
  ),
}));

// Mock ProjectCard to simplify testing
vi.mock('@/components/projects/project-card', () => ({
  ProjectCard: ({
    project,
    onDelete,
    isDeleting,
  }: {
    project: { id: string; name: string };
    onDelete: (id: string) => void;
    isDeleting: boolean;
  }) => (
    <div data-testid={`project-card-${project.id}`}>
      <span>{project.name}</span>
      <button onClick={() => onDelete(project.id)} disabled={isDeleting}>
        削除
      </button>
    </div>
  ),
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

const mockProjectsResponse: ProjectListResponse = {
  projects: [
    {
      id: '1',
      name: 'Test Project 1',
      description: 'Description 1',
      status: 'ACTIVE',
      projectType: 'web',
      targetVersion: '1.0.0',
      createdAt: '2024-01-01T00:00:00.000Z',
      updatedAt: '2024-01-02T00:00:00.000Z',
      _count: { projectMembers: 3 },
    },
    {
      id: '2',
      name: 'Test Project 2',
      description: 'Description 2',
      status: 'PLANNING',
      projectType: 'mobile',
      targetVersion: '2.0.0',
      createdAt: '2024-01-03T00:00:00.000Z',
      updatedAt: '2024-01-04T00:00:00.000Z',
      _count: { projectMembers: 5 },
    },
  ],
  total: 2,
  page: 1,
  limit: 12,
  totalPages: 1,
};

describe('ProjectsPage', () => {
  beforeEach(() => {
    vi.clearAllMocks();
    clearProjectsCache();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProjectsResponse),
    });
  });

  it('should render page title', async () => {
    render(<ProjectsPage />);

    expect(screen.getByText('プロジェクト一覧')).toBeDefined();
  });

  it('should display projects after loading', async () => {
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeDefined();
    });

    expect(screen.getByText('Test Project 2')).toBeDefined();
  });

  it('should display total count', async () => {
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText(/全2件/)).toBeDefined();
    });
  });

  it('should have search input', async () => {
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeDefined();
    });

    const searchInput = screen.getByPlaceholderText('プロジェクト名または説明で検索...');
    expect(searchInput).toBeDefined();
  });

  it('should have view mode toggle buttons', async () => {
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeDefined();
    });

    const cardViewButton = screen.getByLabelText('カード表示');
    const tableViewButton = screen.getByLabelText('テーブル表示');

    expect(cardViewButton).toBeDefined();
    expect(tableViewButton).toBeDefined();
  });

  it('should show error message on fetch failure', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: false,
      json: () => Promise.resolve({ error: 'Server error' }),
    });

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('プロジェクト一覧の取得に失敗しました。')).toBeDefined();
    });
  });

  it('should show empty state when no projects', async () => {
    mockFetch.mockResolvedValueOnce({
      ok: true,
      json: () =>
        Promise.resolve({
          projects: [],
          total: 0,
          page: 1,
          limit: 12,
          totalPages: 0,
        }),
    });

    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('プロジェクトがありません。')).toBeDefined();
    });
  });

  it('should show clear button when search query is entered', async () => {
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeDefined();
    });

    // Initially no clear button
    expect(screen.queryByText('クリア')).toBeNull();

    // Add search query
    const searchInput = screen.getByPlaceholderText('プロジェクト名または説明で検索...');
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Clear button should appear
    await waitFor(() => {
      expect(screen.getByText('クリア')).toBeDefined();
    });
  });

  it('should clear filters when clear button is clicked', async () => {
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByText('Test Project 1')).toBeDefined();
    });

    // Add search query
    const searchInput = screen.getByPlaceholderText(
      'プロジェクト名または説明で検索...'
    ) as HTMLInputElement;
    fireEvent.change(searchInput, { target: { value: 'test' } });

    // Wait for clear button
    await waitFor(() => {
      expect(screen.getByText('クリア')).toBeDefined();
    });

    // Click clear
    fireEvent.click(screen.getByText('クリア'));

    // Search input should be cleared
    expect(searchInput.value).toBe('');
  });

  it('should have create project button', () => {
    render(<ProjectsPage />);

    expect(screen.getByTestId('create-project-btn')).toBeDefined();
  });

  it('should render project cards in card view', async () => {
    render(<ProjectsPage />);

    await waitFor(() => {
      expect(screen.getByTestId('project-card-1')).toBeDefined();
      expect(screen.getByTestId('project-card-2')).toBeDefined();
    });
  });
});
