'use client';

import * as React from 'react';
import { useRouter } from 'next/navigation';
import { FolderKanban, ChevronsUpDown, Check, Clock, Plus, Search, Loader2 } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
  CommandSeparator,
} from '@/components/ui/command';
import { Popover, PopoverContent, PopoverTrigger } from '@/components/ui/popover';
import { useProject } from '@/contexts/project-context';
import type { Project } from '@/types/project';
import { PROJECT_STATUS_LABELS } from '@/types/project';

interface ProjectSelectorProps {
  collapsed?: boolean;
}

export function ProjectSelector({ collapsed = false }: ProjectSelectorProps) {
  const router = useRouter();
  const { selectedProject, setSelectedProject, recentProjects, isLoading } = useProject();
  const [open, setOpen] = React.useState(false);
  const [projects, setProjects] = React.useState<Project[]>([]);
  const [isLoadingProjects, setIsLoadingProjects] = React.useState(false);
  const [searchQuery, setSearchQuery] = React.useState('');

  // プロジェクト一覧を取得
  const fetchProjects = async () => {
    setIsLoadingProjects(true);
    try {
      const response = await fetch('/api/projects');
      if (response.ok) {
        const data = await response.json();
        setProjects(data);
      }
    } catch {
      // Failed to fetch projects
    } finally {
      setIsLoadingProjects(false);
    }
  };

  // ポップオーバーの開閉を処理
  const handleOpenChange = (newOpen: boolean) => {
    setOpen(newOpen);
    if (newOpen) {
      fetchProjects();
    }
  };

  // プロジェクトを選択
  const handleSelectProject = (project: Project) => {
    setSelectedProject(project);
    setOpen(false);
  };

  // 新規プロジェクト作成画面へ遷移
  const handleCreateProject = () => {
    setOpen(false);
    router.push('/projects?action=create');
  };

  // 検索でフィルタされたプロジェクト
  const filteredProjects = React.useMemo(() => {
    if (!searchQuery) return projects;
    const query = searchQuery.toLowerCase();
    return projects.filter(
      (project) =>
        project.name.toLowerCase().includes(query) ||
        project.description?.toLowerCase().includes(query)
    );
  }, [projects, searchQuery]);

  // 最近アクセスしたプロジェクト（現在選択中のものを除く）
  const displayRecentProjects = React.useMemo(() => {
    return recentProjects.filter((p) => p.id !== selectedProject?.id).slice(0, 3);
  }, [recentProjects, selectedProject]);

  if (isLoading) {
    return (
      <div className={cn('flex items-center gap-2 rounded-md px-2 py-1.5', !collapsed && 'w-full')}>
        <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-muted">
          <Loader2 className="size-4 animate-spin" />
        </div>
        {!collapsed && (
          <div className="flex min-w-0 flex-1 flex-col">
            <span className="text-sm text-muted-foreground">読み込み中...</span>
          </div>
        )}
      </div>
    );
  }

  return (
    <Popover open={open} onOpenChange={handleOpenChange}>
      <PopoverTrigger
        render={
          <Button
            variant="ghost"
            role="combobox"
            aria-expanded={open}
            aria-label="プロジェクトを選択"
            className={cn(
              'flex items-center gap-2 rounded-md px-2 py-1.5 text-left hover:bg-sidebar-accent',
              collapsed ? 'justify-center w-full' : 'w-full'
            )}
          >
            <div className="flex size-8 shrink-0 items-center justify-center rounded-md bg-primary text-primary-foreground">
              <FolderKanban className="size-4" />
            </div>
            {!collapsed && (
              <>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-sm font-medium">
                    {selectedProject?.name || 'プロジェクトを選択'}
                  </span>
                  <span className="text-xs text-muted-foreground">
                    {selectedProject
                      ? PROJECT_STATUS_LABELS[selectedProject.status]
                      : 'プロジェクト'}
                  </span>
                </div>
                <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" />
              </>
            )}
          </Button>
        }
      />
      <PopoverContent className="w-72 p-0" align="start">
        <Command shouldFilter={false}>
          <CommandInput
            placeholder="プロジェクトを検索..."
            value={searchQuery}
            onValueChange={setSearchQuery}
          />
          <CommandList>
            <CommandEmpty>
              {isLoadingProjects ? (
                <div className="flex items-center justify-center py-6">
                  <Loader2 className="size-4 animate-spin mr-2" />
                  <span>読み込み中...</span>
                </div>
              ) : (
                'プロジェクトが見つかりません'
              )}
            </CommandEmpty>

            {/* 最近アクセスしたプロジェクト */}
            {displayRecentProjects.length > 0 && !searchQuery && (
              <>
                <CommandGroup heading="最近アクセス">
                  {displayRecentProjects.map((project) => (
                    <CommandItem
                      key={`recent-${project.id}`}
                      value={`recent-${project.id}`}
                      onSelect={() => handleSelectProject(project)}
                      className="cursor-pointer"
                    >
                      <Clock className="mr-2 size-4 text-muted-foreground" />
                      <span className="flex-1 truncate">{project.name}</span>
                    </CommandItem>
                  ))}
                </CommandGroup>
                <CommandSeparator />
              </>
            )}

            {/* 全プロジェクト */}
            <CommandGroup heading="すべてのプロジェクト">
              {isLoadingProjects ? (
                <div className="flex items-center justify-center py-4">
                  <Loader2 className="size-4 animate-spin mr-2" />
                  <span className="text-sm text-muted-foreground">読み込み中...</span>
                </div>
              ) : (
                filteredProjects.map((project) => (
                  <CommandItem
                    key={project.id}
                    value={project.id}
                    onSelect={() => handleSelectProject(project)}
                    className="cursor-pointer"
                  >
                    <FolderKanban className="mr-2 size-4" />
                    <div className="flex flex-1 flex-col min-w-0">
                      <span className="truncate">{project.name}</span>
                      <span className="text-xs text-muted-foreground">
                        {PROJECT_STATUS_LABELS[project.status]}
                      </span>
                    </div>
                    {selectedProject?.id === project.id && (
                      <Check className="ml-2 size-4 shrink-0" />
                    )}
                  </CommandItem>
                ))
              )}
            </CommandGroup>

            <CommandSeparator />

            {/* 新規作成 */}
            <CommandGroup>
              <CommandItem onSelect={handleCreateProject} className="cursor-pointer">
                <Plus className="mr-2 size-4" />
                <span>新規プロジェクト作成</span>
              </CommandItem>
              <CommandItem
                onSelect={() => {
                  setOpen(false);
                  router.push('/projects');
                }}
                className="cursor-pointer"
              >
                <Search className="mr-2 size-4" />
                <span>すべてのプロジェクトを表示</span>
              </CommandItem>
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
