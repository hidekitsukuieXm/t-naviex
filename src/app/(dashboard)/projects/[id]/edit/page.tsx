'use client';

import { useEffect, useState, use } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { buttonVariants } from '@/components/ui/button';
import { ProjectForm } from '@/components/projects/project-form';
import { cn } from '@/lib/utils';
import type { Project, ProjectFormData } from '@/types/project';
import { ArrowLeft, Loader2 } from 'lucide-react';

interface ProjectEditPageProps {
  params: Promise<{ id: string }>;
}

export default function ProjectEditPage({ params }: ProjectEditPageProps) {
  const { id } = use(params);
  const router = useRouter();
  const [project, setProject] = useState<Project | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const fetchProject = async () => {
      try {
        setError(null);
        const response = await fetch(`/api/projects/${id}`);
        if (!response.ok) {
          if (response.status === 404) {
            throw new Error('プロジェクトが見つかりません。');
          }
          throw new Error('プロジェクトの取得に失敗しました。');
        }
        const data = await response.json();
        setProject(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : 'エラーが発生しました。');
      } finally {
        setIsLoading(false);
      }
    };

    fetchProject();
  }, [id]);

  const handleSubmit = async (data: ProjectFormData) => {
    setIsSaving(true);

    try {
      const response = await fetch(`/api/projects/${id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(data),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'プロジェクトの更新に失敗しました。');
      }

      router.push('/projects');
      router.refresh();
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center py-16">
        <Loader2 className="size-8 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (error || !project) {
    return (
      <div className="space-y-6">
        <div>
          <Link href="/projects" className={cn(buttonVariants({ variant: 'ghost' }), 'mb-4')}>
            <ArrowLeft className="mr-2 size-4" />
            プロジェクト一覧に戻る
          </Link>
        </div>
        <Card>
          <CardContent className="py-8">
            <div className="text-center text-destructive">
              {error || 'プロジェクトが見つかりません。'}
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <Link href="/projects" className={cn(buttonVariants({ variant: 'ghost' }), 'mb-4')}>
          <ArrowLeft className="mr-2 size-4" />
          プロジェクト一覧に戻る
        </Link>
        <h1 className="text-2xl font-bold tracking-tight">プロジェクト編集</h1>
        <p className="text-muted-foreground">プロジェクトの情報を編集できます。</p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>{project.name}</CardTitle>
          <CardDescription>プロジェクト情報を更新してください。</CardDescription>
        </CardHeader>
        <CardContent>
          <ProjectForm
            project={project}
            onSubmit={handleSubmit}
            onCancel={() => router.push('/projects')}
            isLoading={isSaving}
          />
        </CardContent>
      </Card>
    </div>
  );
}
