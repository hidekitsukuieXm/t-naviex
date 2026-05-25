'use client';

/**
 * ガントチャート画面
 */

import { useEffect, useState, useCallback, use } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { GanttChart } from '@/components/gantt/gantt-chart';
import type { Task } from '@/types/task';
import type { Milestone } from '@/types/milestone';

interface PageProps {
  params: Promise<{ id: string }>;
}

export default function GanttPage({ params }: PageProps) {
  const { id: projectId } = use(params);
  const router = useRouter();
  const [tasks, setTasks] = useState<Task[]>([]);
  const [milestones, setMilestones] = useState<Milestone[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // データ取得
  useEffect(() => {
    const fetchData = async () => {
      setIsLoading(true);
      setError(null);

      try {
        // タスクとマイルストーンを並列取得
        const [tasksRes, milestonesRes] = await Promise.all([
          fetch(`/api/projects/${projectId}/tasks`),
          fetch(`/api/projects/${projectId}/milestones`),
        ]);

        if (!tasksRes.ok) {
          throw new Error('タスクの取得に失敗しました。');
        }
        if (!milestonesRes.ok) {
          throw new Error('マイルストーンの取得に失敗しました。');
        }

        const [tasksData, milestonesData] = await Promise.all([
          tasksRes.json(),
          milestonesRes.json(),
        ]);

        setTasks(tasksData);
        setMilestones(milestonesData);
      } catch (err) {
        const message = err instanceof Error ? err.message : 'データの取得に失敗しました。';
        setError(message);
        toast.error(message);
      } finally {
        setIsLoading(false);
      }
    };

    fetchData();
  }, [projectId]);

  // タスククリックハンドラ
  const handleTaskClick = useCallback((taskId: string) => {
    // タスク詳細画面への遷移（将来的に実装）
    toast.info(`タスク ${taskId} を選択しました`);
  }, []);

  // マイルストーンクリックハンドラ
  const handleMilestoneClick = useCallback(
    (_milestoneId: string) => {
      router.push(`/projects/${projectId}/milestones`);
    },
    [router, projectId]
  );

  // タスク日付変更ハンドラ
  const handleTaskDateChange = useCallback(
    async (taskId: string, startDate: Date, endDate: Date) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            startDate: startDate.toISOString().split('T')[0],
            endDate: endDate.toISOString().split('T')[0],
          }),
        });

        if (!res.ok) {
          throw new Error('タスクの更新に失敗しました。');
        }

        const updatedTask = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t)));
        toast.success('タスクの日程を更新しました。');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'タスクの更新に失敗しました。';
        toast.error(message);
      }
    },
    [projectId]
  );

  // タスク進捗変更ハンドラ
  const handleTaskProgressChange = useCallback(
    async (taskId: string, progress: number) => {
      try {
        const res = await fetch(`/api/projects/${projectId}/tasks/${taskId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ progress: Math.round(progress) }),
        });

        if (!res.ok) {
          throw new Error('タスクの更新に失敗しました。');
        }

        const updatedTask = await res.json();
        setTasks((prev) => prev.map((t) => (t.id === taskId ? { ...t, ...updatedTask } : t)));
        toast.success('進捗を更新しました。');
      } catch (err) {
        const message = err instanceof Error ? err.message : 'タスクの更新に失敗しました。';
        toast.error(message);
      }
    },
    [projectId]
  );

  // ローディング中
  if (isLoading) {
    return (
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">ガントチャート</h1>
          <p className="text-muted-foreground">
            プロジェクトのタスクとマイルストーンを時系列で表示
          </p>
        </div>
        <div className="flex items-center justify-center h-64">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
        </div>
      </div>
    );
  }

  // エラー表示
  if (error) {
    return (
      <div className="container py-6">
        <div className="mb-6">
          <h1 className="text-2xl font-bold">ガントチャート</h1>
          <p className="text-muted-foreground">
            プロジェクトのタスクとマイルストーンを時系列で表示
          </p>
        </div>
        <div className="flex items-center justify-center h-64 bg-destructive/10 rounded-lg">
          <p className="text-destructive">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">ガントチャート</h1>
        <p className="text-muted-foreground">プロジェクトのタスクとマイルストーンを時系列で表示</p>
      </div>

      <GanttChart
        tasks={tasks}
        milestones={milestones}
        onTaskClick={handleTaskClick}
        onMilestoneClick={handleMilestoneClick}
        onTaskDateChange={handleTaskDateChange}
        onTaskProgressChange={handleTaskProgressChange}
      />

      {/* 統計情報 */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-6">
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">総タスク数</p>
          <p className="text-2xl font-bold">{tasks.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">日程設定済みタスク</p>
          <p className="text-2xl font-bold">
            {tasks.filter((t) => t.startDate && t.endDate).length}
          </p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">マイルストーン数</p>
          <p className="text-2xl font-bold">{milestones.length}</p>
        </div>
        <div className="bg-card border rounded-lg p-4">
          <p className="text-sm text-muted-foreground">期限設定済みマイルストーン</p>
          <p className="text-2xl font-bold">{milestones.filter((m) => m.dueDate).length}</p>
        </div>
      </div>
    </div>
  );
}
