/**
 * ダッシュボード関連の型定義
 */

import type { Dashboard, DashboardWidget, WidgetType } from '@/generated/prisma';

// ウィジェットタイプ定数
export const WidgetTypes = {
  PROGRESS_SUMMARY: 'PROGRESS_SUMMARY',
  PROGRESS_CHART: 'PROGRESS_CHART',
  BUG_SUMMARY: 'BUG_SUMMARY',
  BUG_CHART: 'BUG_CHART',
  TEAM_INFO: 'TEAM_INFO',
  MILESTONE: 'MILESTONE',
  RECENT_ACTIVITY: 'RECENT_ACTIVITY',
  COVERAGE_STATS: 'COVERAGE_STATS',
  BURNDOWN_CHART: 'BURNDOWN_CHART',
  RELIABILITY_CHART: 'RELIABILITY_CHART',
  CUSTOM: 'CUSTOM',
} as const;

// ウィジェットタイプラベル
export const WidgetTypeLabels: Record<WidgetType, string> = {
  PROGRESS_SUMMARY: '進捗サマリー',
  PROGRESS_CHART: '進捗グラフ',
  BUG_SUMMARY: 'バグ集計',
  BUG_CHART: 'バグ分布',
  TEAM_INFO: 'チーム情報',
  MILESTONE: 'マイルストーン',
  RECENT_ACTIVITY: '最近のアクティビティ',
  COVERAGE_STATS: 'カバレッジ',
  BURNDOWN_CHART: 'バーンダウン',
  RELIABILITY_CHART: '信頼度成長曲線',
  CUSTOM: 'カスタム',
};

// 関連を含むダッシュボード
export interface DashboardWithWidgets extends Dashboard {
  widgets: DashboardWidget[];
}

// 安全なシリアライズ用（BigIntをstringに変換）
export interface DashboardSafe {
  id: string;
  projectId: string | null;
  userId: string;
  name: string;
  description: string | null;
  isDefault: boolean;
  isPublic: boolean;
  shareToken: string | null;
  layout: Record<string, unknown> | null;
  createdAt: Date;
  updatedAt: Date;
  widgets?: DashboardWidgetSafe[];
}

export interface DashboardWidgetSafe {
  id: string;
  dashboardId: string;
  widgetType: WidgetType;
  title: string | null;
  x: number;
  y: number;
  width: number;
  height: number;
  config: Record<string, unknown> | null;
  sortOrder: number;
  createdAt: Date;
  updatedAt: Date;
}

// ウィジェット設定の型定義
export interface ProgressSummaryConfig {
  testRunId?: string;
  showPercentage?: boolean;
}

export interface ProgressChartConfig {
  testRunId?: string;
  chartType?: 'bar' | 'line' | 'area';
  showLegend?: boolean;
}

export interface BugSummaryConfig {
  groupBy?: 'status' | 'priority' | 'severity' | 'type';
  showCount?: boolean;
}

export interface BugChartConfig {
  chartType?: 'pie' | 'bar' | 'doughnut';
  groupBy?: 'status' | 'priority' | 'severity' | 'type';
}

export interface TeamInfoConfig {
  showAvatar?: boolean;
  showRole?: boolean;
}

export interface MilestoneConfig {
  showCompleted?: boolean;
  limit?: number;
}

export interface BurndownConfig {
  testRunId?: string;
  startDate?: string;
  endDate?: string;
}

export interface ReliabilityChartConfig {
  model?: 'gompertz' | 'logistic';
  startDate?: string;
  endDate?: string;
}

export type WidgetConfig =
  | ProgressSummaryConfig
  | ProgressChartConfig
  | BugSummaryConfig
  | BugChartConfig
  | TeamInfoConfig
  | MilestoneConfig
  | BurndownConfig
  | ReliabilityChartConfig
  | Record<string, unknown>;

// 変換ユーティリティ
export function toDashboardSafe(dashboard: DashboardWithWidgets): DashboardSafe {
  return {
    id: dashboard.id.toString(),
    projectId: dashboard.projectId?.toString() ?? null,
    userId: dashboard.userId.toString(),
    name: dashboard.name,
    description: dashboard.description,
    isDefault: dashboard.isDefault,
    isPublic: dashboard.isPublic,
    shareToken: dashboard.shareToken,
    layout: dashboard.layout as Record<string, unknown> | null,
    createdAt: dashboard.createdAt,
    updatedAt: dashboard.updatedAt,
    widgets: dashboard.widgets?.map(toWidgetSafe),
  };
}

export function toWidgetSafe(widget: DashboardWidget): DashboardWidgetSafe {
  return {
    id: widget.id.toString(),
    dashboardId: widget.dashboardId.toString(),
    widgetType: widget.widgetType,
    title: widget.title,
    x: widget.x,
    y: widget.y,
    width: widget.width,
    height: widget.height,
    config: widget.config as Record<string, unknown> | null,
    sortOrder: widget.sortOrder,
    createdAt: widget.createdAt,
    updatedAt: widget.updatedAt,
  };
}

// ダッシュボードグリッドレイアウト設定
export interface DashboardLayout {
  columns: number;
  rowHeight: number;
  gap: number;
}

export const DEFAULT_LAYOUT: DashboardLayout = {
  columns: 12,
  rowHeight: 100,
  gap: 16,
};
