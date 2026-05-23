import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { renderHook, act, waitFor } from '@testing-library/react';
import { useProject, ProjectProvider } from '../project-context';
import type { Project } from '@/types/project';

// Mock next/navigation
const mockPush = vi.fn();
const mockReplace = vi.fn();
const mockSearchParams = new URLSearchParams();

vi.mock('next/navigation', () => ({
  useRouter: () => ({
    push: mockPush,
    replace: mockReplace,
  }),
  usePathname: () => '/dashboard',
  useSearchParams: () => mockSearchParams,
}));

// Mock fetch
const mockFetch = vi.fn();
global.fetch = mockFetch;

// Mock localStorage
const localStorageMock = (() => {
  let store: Record<string, string> = {};
  return {
    getItem: vi.fn((key: string) => store[key] || null),
    setItem: vi.fn((key: string, value: string) => {
      store[key] = value;
    }),
    removeItem: vi.fn((key: string) => {
      delete store[key];
    }),
    clear: vi.fn(() => {
      store = {};
    }),
  };
})();
Object.defineProperty(window, 'localStorage', { value: localStorageMock });

describe('ProjectContext', () => {
  const mockProject: Project = {
    id: '1',
    name: 'Test Project',
    description: 'Test description',
    status: 'ACTIVE',
    projectType: 'web',
    targetVersion: '1.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  const mockProject2: Project = {
    id: '2',
    name: 'Another Project',
    description: 'Another description',
    status: 'PLANNING',
    projectType: 'mobile',
    targetVersion: '2.0.0',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
  };

  beforeEach(() => {
    vi.clearAllMocks();
    localStorageMock.clear();
    mockFetch.mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(mockProject),
    });
  });

  afterEach(() => {
    vi.resetAllMocks();
  });

  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <ProjectProvider>{children}</ProjectProvider>
  );

  describe('useProject hook', () => {
    it('should throw error when used outside of ProjectProvider', () => {
      expect(() => {
        renderHook(() => useProject());
      }).toThrow('useProject must be used within a ProjectProvider');
    });

    it('should provide initial context values', async () => {
      const { result } = renderHook(() => useProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      expect(result.current.selectedProject).toBeNull();
      expect(result.current.recentProjects).toEqual([]);
    });

    it('should set selected project', async () => {
      const { result } = renderHook(() => useProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSelectedProject(mockProject);
      });

      expect(result.current.selectedProject).toEqual(mockProject);
    });

    it('should add project to recent projects when selected', async () => {
      const { result } = renderHook(() => useProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSelectedProject(mockProject);
      });

      expect(result.current.recentProjects).toContainEqual(mockProject);
    });

    it('should add to recent projects manually', async () => {
      const { result } = renderHook(() => useProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.addToRecentProjects(mockProject);
      });

      expect(result.current.recentProjects).toContainEqual(mockProject);
    });

    it('should not duplicate projects in recent list', async () => {
      const { result } = renderHook(() => useProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.addToRecentProjects(mockProject);
        result.current.addToRecentProjects(mockProject);
      });

      const projectCount = result.current.recentProjects.filter(
        (p) => p.id === mockProject.id
      ).length;
      expect(projectCount).toBe(1);
    });

    it('should limit recent projects to 5', async () => {
      const { result } = renderHook(() => useProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      // Add 6 projects
      act(() => {
        for (let i = 1; i <= 6; i++) {
          result.current.addToRecentProjects({
            ...mockProject,
            id: i.toString(),
            name: `Project ${i}`,
          });
        }
      });

      expect(result.current.recentProjects.length).toBeLessThanOrEqual(5);
    });

    it('should clear recent projects', async () => {
      const { result } = renderHook(() => useProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.addToRecentProjects(mockProject);
        result.current.addToRecentProjects(mockProject2);
      });

      expect(result.current.recentProjects.length).toBe(2);

      act(() => {
        result.current.clearRecentProjects();
      });

      expect(result.current.recentProjects).toEqual([]);
    });

    it('should update URL when project is selected', async () => {
      const { result } = renderHook(() => useProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSelectedProject(mockProject);
      });

      expect(mockReplace).toHaveBeenCalled();
    });

    it('should clear selected project', async () => {
      const { result } = renderHook(() => useProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSelectedProject(mockProject);
      });

      expect(result.current.selectedProject).toEqual(mockProject);

      act(() => {
        result.current.setSelectedProject(null);
      });

      expect(result.current.selectedProject).toBeNull();
    });

    it('should persist selected project ID to localStorage', async () => {
      const { result } = renderHook(() => useProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.setSelectedProject(mockProject);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        't-naviex-selected-project',
        mockProject.id
      );
    });

    it('should persist recent projects to localStorage', async () => {
      const { result } = renderHook(() => useProject(), { wrapper });

      await waitFor(() => {
        expect(result.current.isLoading).toBe(false);
      });

      act(() => {
        result.current.addToRecentProjects(mockProject);
      });

      expect(localStorageMock.setItem).toHaveBeenCalledWith(
        't-naviex-recent-projects',
        expect.any(String)
      );
    });
  });
});
