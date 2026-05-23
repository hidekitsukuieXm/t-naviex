'use client';

import * as React from 'react';
import { useRouter, usePathname, useSearchParams } from 'next/navigation';
import type { Project } from '@/types/project';

const PROJECT_STORAGE_KEY = 't-naviex-selected-project';
const RECENT_PROJECTS_KEY = 't-naviex-recent-projects';
const MAX_RECENT_PROJECTS = 5;

interface ProjectContextValue {
  selectedProject: Project | null;
  setSelectedProject: (project: Project | null) => void;
  recentProjects: Project[];
  addToRecentProjects: (project: Project) => void;
  clearRecentProjects: () => void;
  isLoading: boolean;
}

const ProjectContext = React.createContext<ProjectContextValue | null>(null);

export function useProject() {
  const context = React.useContext(ProjectContext);
  if (!context) {
    throw new Error('useProject must be used within a ProjectProvider');
  }
  return context;
}

// localStorageから選択中のプロジェクトIDを取得
function getStoredProjectId(): string | null {
  if (typeof window === 'undefined') return null;
  try {
    return localStorage.getItem(PROJECT_STORAGE_KEY);
  } catch {
    return null;
  }
}

// localStorageに選択中のプロジェクトIDを保存
function setStoredProjectId(projectId: string | null): void {
  if (typeof window === 'undefined') return;
  try {
    if (projectId) {
      localStorage.setItem(PROJECT_STORAGE_KEY, projectId);
    } else {
      localStorage.removeItem(PROJECT_STORAGE_KEY);
    }
  } catch {
    // localStorage access failed
  }
}

// localStorageから最近アクセスしたプロジェクトを取得
function getStoredRecentProjects(): Project[] {
  if (typeof window === 'undefined') return [];
  try {
    const stored = localStorage.getItem(RECENT_PROJECTS_KEY);
    if (stored) {
      return JSON.parse(stored) as Project[];
    }
  } catch {
    // Parse error
  }
  return [];
}

// localStorageに最近アクセスしたプロジェクトを保存
function setStoredRecentProjects(projects: Project[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem(RECENT_PROJECTS_KEY, JSON.stringify(projects));
  } catch {
    // localStorage access failed
  }
}

// URLを更新するヘルパー関数
function buildUrlWithProject(
  pathname: string,
  searchParams: URLSearchParams,
  projectId: string | null
): string {
  const params = new URLSearchParams(searchParams.toString());
  if (projectId) {
    params.set('projectId', projectId);
  } else {
    params.delete('projectId');
  }
  return params.toString() ? `${pathname}?${params.toString()}` : pathname;
}

interface ProjectProviderProps {
  children: React.ReactNode;
}

export function ProjectProvider({ children }: ProjectProviderProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const [selectedProject, setSelectedProjectState] = React.useState<Project | null>(null);
  const [recentProjects, setRecentProjectsState] = React.useState<Project[]>([]);
  const [isLoading, setIsLoading] = React.useState(true);
  const [isInitialized, setIsInitialized] = React.useState(false);

  // 初期化: URLパラメータまたはlocalStorageからプロジェクトを復元
  React.useEffect(() => {
    if (isInitialized) return;

    const initializeProject = async () => {
      setIsLoading(true);

      // 最近アクセスしたプロジェクトを読み込み
      const storedRecent = getStoredRecentProjects();
      setRecentProjectsState(storedRecent);

      // URLパラメータからプロジェクトIDを取得
      const projectIdFromUrl = searchParams.get('projectId');
      const storedProjectId = getStoredProjectId();
      const projectIdToLoad = projectIdFromUrl || storedProjectId;

      if (projectIdToLoad) {
        try {
          const response = await fetch(`/api/projects/${projectIdToLoad}`);
          if (response.ok) {
            const project = await response.json();
            setSelectedProjectState(project);
            if (!projectIdFromUrl && storedProjectId) {
              // URLにプロジェクトIDがない場合は追加
              const newUrl = buildUrlWithProject(pathname, searchParams, project.id);
              router.replace(newUrl, { scroll: false });
            }
          }
        } catch {
          // Failed to fetch project
        }
      }

      setIsLoading(false);
      setIsInitialized(true);
    };

    initializeProject();
  }, [searchParams, isInitialized, pathname, router]);

  // プロジェクトを選択
  const setSelectedProject = React.useCallback(
    (project: Project | null) => {
      setSelectedProjectState(project);
      setStoredProjectId(project?.id || null);

      // URLを更新
      const newUrl = buildUrlWithProject(pathname, searchParams, project?.id || null);
      router.replace(newUrl, { scroll: false });

      if (project) {
        // 最近アクセスしたプロジェクトに追加
        setRecentProjectsState((prev) => {
          const filtered = prev.filter((p) => p.id !== project.id);
          const updated = [project, ...filtered].slice(0, MAX_RECENT_PROJECTS);
          setStoredRecentProjects(updated);
          return updated;
        });
      }
    },
    [pathname, searchParams, router]
  );

  // 最近アクセスしたプロジェクトに追加
  const addToRecentProjects = React.useCallback((project: Project) => {
    setRecentProjectsState((prev) => {
      const filtered = prev.filter((p) => p.id !== project.id);
      const updated = [project, ...filtered].slice(0, MAX_RECENT_PROJECTS);
      setStoredRecentProjects(updated);
      return updated;
    });
  }, []);

  // 最近アクセスしたプロジェクトをクリア
  const clearRecentProjects = React.useCallback(() => {
    setRecentProjectsState([]);
    setStoredRecentProjects([]);
  }, []);

  const value = React.useMemo(
    () => ({
      selectedProject,
      setSelectedProject,
      recentProjects,
      addToRecentProjects,
      clearRecentProjects,
      isLoading,
    }),
    [
      selectedProject,
      setSelectedProject,
      recentProjects,
      addToRecentProjects,
      clearRecentProjects,
      isLoading,
    ]
  );

  return <ProjectContext.Provider value={value}>{children}</ProjectContext.Provider>;
}
