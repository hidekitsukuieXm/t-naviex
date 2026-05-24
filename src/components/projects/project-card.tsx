'use client';

import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button, buttonVariants } from '@/components/ui/button';
import { type Project, type ProjectStatus, PROJECT_STATUS_LABELS } from '@/types/project';
import { Pencil, Trash2, Loader2, Users, Calendar, Tag } from 'lucide-react';

const STATUS_COLORS: Record<ProjectStatus, string> = {
  ACTIVE: 'bg-green-100 text-green-700 dark:bg-green-900/20 dark:text-green-400',
  INACTIVE: 'bg-gray-100 text-gray-700 dark:bg-gray-900/20 dark:text-gray-400',
  ARCHIVED: 'bg-yellow-100 text-yellow-700 dark:bg-yellow-900/20 dark:text-yellow-400',
  PLANNING: 'bg-blue-100 text-blue-700 dark:bg-blue-900/20 dark:text-blue-400',
};

interface ProjectCardProps {
  project: Project;
  onDelete: (id: string) => void;
  isDeleting: boolean;
}

export function ProjectCard({ project, onDelete, isDeleting }: ProjectCardProps) {
  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString('ja-JP', {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
    });
  };

  return (
    <Card className="group relative overflow-hidden transition-all hover:shadow-md">
      <CardHeader className="pb-2">
        <div className="flex items-start justify-between">
          <div className="flex-1">
            <CardTitle className="line-clamp-1 text-lg">{project.name}</CardTitle>
            <CardDescription className="mt-1 line-clamp-2 min-h-[2.5rem]">
              {project.description || 'プロジェクトの説明がありません'}
            </CardDescription>
          </div>
          <span
            className={`ml-2 inline-flex shrink-0 rounded-full px-2 py-1 text-xs font-medium ${STATUS_COLORS[project.status]}`}
          >
            {PROJECT_STATUS_LABELS[project.status]}
          </span>
        </div>
      </CardHeader>
      <CardContent className="pt-2">
        <div className="mb-4 flex flex-wrap gap-3 text-sm text-muted-foreground">
          {project.projectType && (
            <div className="flex items-center gap-1">
              <Tag className="size-3.5" />
              <span>{project.projectType}</span>
            </div>
          )}
          {project.targetVersion && (
            <div className="flex items-center gap-1">
              <span className="text-xs">v{project.targetVersion}</span>
            </div>
          )}
          {project._count && (
            <div className="flex items-center gap-1">
              <Users className="size-3.5" />
              <span>{project._count.projectMembers}人</span>
            </div>
          )}
          <div className="flex items-center gap-1">
            <Calendar className="size-3.5" />
            <span>{formatDate(project.createdAt)}</span>
          </div>
        </div>
        <div className="flex gap-2">
          <Link
            href={`/projects/${project.id}/edit`}
            className={buttonVariants({ variant: 'outline', size: 'sm', className: 'flex-1' })}
          >
            <Pencil className="mr-1.5 size-3.5" />
            編集
          </Link>
          <Button
            variant="outline"
            size="sm"
            onClick={() => onDelete(project.id)}
            disabled={isDeleting}
            className="flex-1 text-destructive hover:text-destructive"
          >
            {isDeleting ? (
              <Loader2 className="mr-1.5 size-3.5 animate-spin" />
            ) : (
              <Trash2 className="mr-1.5 size-3.5" />
            )}
            削除
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
