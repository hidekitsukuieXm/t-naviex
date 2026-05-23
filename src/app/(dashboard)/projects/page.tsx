'use client';

import { useCallback, useEffect, useState, useTransition } from 'react';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { ProjectCreateDialog } from '@/components/projects/project-create-dialog';
import { type Project, type ProjectStatus, PROJECT_STATUS_LABELS } from '@/types/project';
import { Pencil, Trash2, Loader2, FolderOpen } from 'lucide-react';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  INACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
  ARCHIVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  PLANNING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
};

// Cache for initial project fetch
const projectsCache = new Map<string, { projects: Project[]; timestamp: number }>();
const CACHE_KEY = 'projects';

function getInitialState(): { projects: Project[]; isLoading: boolean; error: string | null } {
  const cached = projectsCache.get(CACHE_KEY);
  if (cached && Date.now() - cached.timestamp < 60000) {
    return { projects: cached.projects, isLoading: false, error: null };
  }
  return { projects: [], isLoading: true, error: null };
}

export default function ProjectsPage() {
  const initialState = getInitialState();
  const [projects, setProjects] = useState<Project[]>(initialState.projects);
  const [isLoading, setIsLoading] = useState(initialState.isLoading);
  const [error, setError] = useState<string | null>(initialState.error);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const fetchProjects = useCallback(async () => {
    try {
      const response = await fetch('/api/projects');
      if (!response.ok) {
        throw new Error('プロジェクトの取得に失敗しました。');
      }
      const data = await response.json();
      projectsCache.set(CACHE_KEY, { projects: data, timestamp: Date.now() });
      startTransition(() => {
        setProjects(data);
        setError(null);
        setIsLoading(false);
      });
    } catch (err) {
      startTransition(() => {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
        setIsLoading(false);
      });
    }
  }, []);

  useEffect(() => {
    const cached = projectsCache.get(CACHE_KEY);
    if (!cached || Date.now() - cached.timestamp >= 60000) {
      fetchProjects();
    }
  }, [fetchProjects]);

  const handleDelete = async (id: string) => {
    if (!confirm('このプロジェクトを削除してもよろしいですか？')) {
      return;
    }

    setDeletingId(id);
    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'DELETE',
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'プロジェクトの削除に失敗しました。');
      }

      setProjects((prev) => prev.filter((p) => p.id !== id));
    } catch (err) {
      alert(err instanceof Error ? err.message : 'エラーが発生しました。');
    } finally {
      setDeletingId(null);
    }
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">プロジェクト一覧</h1>
          <p className="text-muted-foreground">プロジェクトの管理・作成ができます。</p>
        </div>
        <ProjectCreateDialog onSuccess={fetchProjects} />
      </div>

      <Card>
        <CardHeader>
          <CardTitle>プロジェクト</CardTitle>
          <CardDescription>登録されているプロジェクトの一覧です。</CardDescription>
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="size-8 animate-spin text-muted-foreground" />
            </div>
          ) : error ? (
            <div className="py-8 text-center text-destructive">{error}</div>
          ) : projects.length === 0 ? (
            <div className="flex flex-col items-center justify-center py-8 text-muted-foreground">
              <FolderOpen className="mb-4 size-12" />
              <p>プロジェクトがありません。</p>
              <p className="text-sm">「新規プロジェクト」ボタンから作成してください。</p>
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>プロジェクト名</TableHead>
                  <TableHead>ステータス</TableHead>
                  <TableHead>タイプ</TableHead>
                  <TableHead>対象バージョン</TableHead>
                  <TableHead>作成日</TableHead>
                  <TableHead className="text-right">操作</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {projects.map((project) => (
                  <TableRow key={project.id}>
                    <TableCell className="font-medium">
                      <div>
                        <div>{project.name}</div>
                        {project.description && (
                          <div className="max-w-xs truncate text-sm text-muted-foreground">
                            {project.description}
                          </div>
                        )}
                      </div>
                    </TableCell>
                    <TableCell>
                      <span
                        className={`inline-flex rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[project.status]}`}
                      >
                        {PROJECT_STATUS_LABELS[project.status]}
                      </span>
                    </TableCell>
                    <TableCell>{project.projectType || '-'}</TableCell>
                    <TableCell>{project.targetVersion || '-'}</TableCell>
                    <TableCell>{formatDate(project.createdAt)}</TableCell>
                    <TableCell className="text-right">
                      <div className="flex justify-end gap-2">
                        <Link
                          href={`/projects/${project.id}/edit`}
                          className={buttonVariants({ variant: 'outline', size: 'sm' })}
                        >
                          <Pencil className="mr-1 size-3" />
                          編集
                        </Link>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelete(project.id)}
                          disabled={deletingId === project.id}
                          className="text-destructive hover:text-destructive"
                        >
                          {deletingId === project.id ? (
                            <Loader2 className="mr-1 size-3 animate-spin" />
                          ) : (
                            <Trash2 className="mr-1 size-3" />
                          )}
                          削除
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
