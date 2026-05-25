'use client';

/**
 * ガントチャートコンポーネント
 */

import { useMemo, useState, useCallback } from 'react';
import { Gantt, Task as GanttTask, ViewMode } from '@wamra/gantt-task-react';
import '@wamra/gantt-task-react/dist/style.css';
import type { Task } from '@/types/task';
import type { Milestone } from '@/types/milestone';
import { Button } from '@/components/ui/button';

// ============================================
// 型定義
// ============================================

export type ZoomLevel = 'day' | 'week' | 'month';

export interface GanttChartProps {
  tasks: Task[];
  milestones: Milestone[];
  onTaskClick?: (taskId: string) => void;
  onMilestoneClick?: (milestoneId: string) => void;
  onTaskDateChange?: (taskId: string, startDate: Date, endDate: Date) => void;
  onTaskProgressChange?: (taskId: string, progress: number) => void;
  className?: string;
}

// ============================================
// ヘルパー関数
// ============================================

function getViewModeFromZoom(zoom: ZoomLevel): ViewMode {
  switch (zoom) {
    case 'day':
      return ViewMode.Day;
    case 'week':
      return ViewMode.Week;
    case 'month':
      return ViewMode.Month;
    default:
      return ViewMode.Day;
  }
}

function getTaskStatusColor(status: string): { bg: string; progress: string } {
  switch (status) {
    case 'NOT_STARTED':
      return { bg: '#9ca3af', progress: '#6b7280' };
    case 'IN_PROGRESS':
      return { bg: '#3b82f6', progress: '#2563eb' };
    case 'COMPLETED':
      return { bg: '#22c55e', progress: '#16a34a' };
    case 'ON_HOLD':
      return { bg: '#eab308', progress: '#ca8a04' };
    case 'CANCELLED':
      return { bg: '#ef4444', progress: '#dc2626' };
    default:
      return { bg: '#9ca3af', progress: '#6b7280' };
  }
}

function getMilestoneStatusColor(status: string): string {
  switch (status) {
    case 'PLANNED':
      return '#9ca3af';
    case 'IN_PROGRESS':
      return '#3b82f6';
    case 'COMPLETED':
      return '#22c55e';
    case 'CANCELLED':
      return '#ef4444';
    default:
      return '#9ca3af';
  }
}

function convertTaskToGanttTask(task: Task): GanttTask | null {
  // 日付がない場合はガントチャートに表示できない
  if (!task.startDate || !task.endDate) {
    return null;
  }

  const colors = getTaskStatusColor(task.status);

  return {
    id: `task-${task.id}`,
    name: task.title,
    type: 'task',
    start: new Date(task.startDate),
    end: new Date(task.endDate),
    progress: task.progress,
    assignees: [],
    isDisabled: task.status === 'COMPLETED' || task.status === 'CANCELLED',
    styles: {
      backgroundColor: colors.bg,
      progressColor: colors.progress,
      progressSelectedColor: colors.progress,
    },
    dependencies: task.parentId ? [`task-${task.parentId}`] : [],
  };
}

function convertMilestoneToGanttTask(milestone: Milestone): GanttTask | null {
  // dueDateがない場合は表示できない
  if (!milestone.dueDate) {
    return null;
  }

  const color = getMilestoneStatusColor(milestone.status);
  const date = new Date(milestone.dueDate);

  return {
    id: `milestone-${milestone.id}`,
    name: milestone.name,
    type: 'milestone',
    start: date,
    end: date,
    progress: milestone.status === 'COMPLETED' ? 100 : 0,
    assignees: [],
    isDisabled: milestone.status === 'COMPLETED' || milestone.status === 'CANCELLED',
    styles: {
      backgroundColor: color,
      progressColor: color,
    },
  };
}

// ============================================
// コンポーネント
// ============================================

export function GanttChart({
  tasks,
  milestones,
  onTaskClick,
  onMilestoneClick,
  onTaskDateChange,
  onTaskProgressChange,
  className,
}: GanttChartProps) {
  const [zoom, setZoom] = useState<ZoomLevel>('week');

  // タスクとマイルストーンをGantt形式に変換
  const ganttTasks = useMemo<GanttTask[]>(() => {
    const convertedTasks = tasks
      .map(convertTaskToGanttTask)
      .filter((t): t is GanttTask => t !== null);

    const convertedMilestones = milestones
      .map(convertMilestoneToGanttTask)
      .filter((m): m is GanttTask => m !== null);

    return [...convertedTasks, ...convertedMilestones];
  }, [tasks, milestones]);

  // クリックハンドラ
  const handleClick = useCallback(
    (task: GanttTask) => {
      const [type, id] = task.id.split('-');
      if (type === 'task' && onTaskClick) {
        onTaskClick(id);
      } else if (type === 'milestone' && onMilestoneClick) {
        onMilestoneClick(id);
      }
    },
    [onTaskClick, onMilestoneClick]
  );

  // ダブルクリックハンドラ
  const handleDoubleClick = useCallback(
    (task: GanttTask) => {
      const [type, id] = task.id.split('-');
      if (type === 'task' && onTaskClick) {
        onTaskClick(id);
      } else if (type === 'milestone' && onMilestoneClick) {
        onMilestoneClick(id);
      }
    },
    [onTaskClick, onMilestoneClick]
  );

  // 日付変更ハンドラ
  const handleDateChange = useCallback(
    (task: GanttTask) => {
      const [type, id] = task.id.split('-');
      if (type === 'task' && onTaskDateChange) {
        onTaskDateChange(id, task.start, task.end);
      }
    },
    [onTaskDateChange]
  );

  // 進捗変更ハンドラ
  const handleProgressChange = useCallback(
    (task: GanttTask) => {
      const [type, id] = task.id.split('-');
      if (type === 'task' && onTaskProgressChange) {
        onTaskProgressChange(id, task.progress);
      }
    },
    [onTaskProgressChange]
  );

  // データがない場合
  if (ganttTasks.length === 0) {
    return (
      <div
        className={`flex items-center justify-center h-64 bg-muted/20 rounded-lg ${className || ''}`}
      >
        <p className="text-muted-foreground">
          表示できるタスクまたはマイルストーンがありません。
          <br />
          開始日と終了日が設定されたタスク、または期限日が設定されたマイルストーンを追加してください。
        </p>
      </div>
    );
  }

  return (
    <div className={className}>
      {/* ズームコントロール */}
      <div className="flex items-center gap-2 mb-4">
        <span className="text-sm font-medium text-muted-foreground">表示単位:</span>
        <div className="flex gap-1">
          <Button
            variant={zoom === 'day' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoom('day')}
          >
            日
          </Button>
          <Button
            variant={zoom === 'week' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoom('week')}
          >
            週
          </Button>
          <Button
            variant={zoom === 'month' ? 'default' : 'outline'}
            size="sm"
            onClick={() => setZoom('month')}
          >
            月
          </Button>
        </div>
      </div>

      {/* 凡例 */}
      <div className="flex flex-wrap items-center gap-4 mb-4 text-sm">
        <span className="font-medium">凡例:</span>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-gray-400" />
          <span>未着手</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-blue-500" />
          <span>進行中</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-green-500" />
          <span>完了</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-yellow-500" />
          <span>保留</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rounded bg-red-500" />
          <span>キャンセル</span>
        </div>
        <div className="flex items-center gap-1">
          <span className="w-3 h-3 rotate-45 bg-gray-400" />
          <span>マイルストーン</span>
        </div>
      </div>

      {/* ガントチャート */}
      <div className="border rounded-lg overflow-hidden bg-background">
        <Gantt
          tasks={ganttTasks}
          viewMode={getViewModeFromZoom(zoom)}
          onClick={handleClick}
          onDoubleClick={handleDoubleClick}
          onDateChange={handleDateChange}
          onProgressChange={handleProgressChange}
          locale="ja-JP"
          listCellWidth=""
          columnWidth={zoom === 'day' ? 65 : zoom === 'week' ? 150 : 200}
          ganttHeight={400}
          barCornerRadius={4}
          todayColor="rgba(59, 130, 246, 0.2)"
          arrowColor="#6b7280"
        />
      </div>
    </div>
  );
}
