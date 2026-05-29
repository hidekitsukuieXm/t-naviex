/**
 * バグ変更履歴型定義
 */

import { z } from 'zod';
import { BugStatusLabels, BugPriorityLabels, BugSeverityLabels, BugTypeLabels } from './bug';

// ============================================
// Constants
// ============================================

export const BUG_FIELD_LABELS: Record<string, string> = {
  title: 'タイトル',
  description: '説明',
  type: '種別',
  status: 'ステータス',
  priority: '優先度',
  severity: '重要度',
  assigneeId: '担当者',
  stepsToReproduce: '再現手順',
  expectedResult: '期待結果',
  actualResult: '実際の結果',
  environment: '環境',
  version: 'バージョン',
  fixedVersion: '修正バージョン',
  dueDate: '期限日',
  parentBugId: '親バグ',
  externalId: '外部ID',
  externalUrl: '外部URL',
};

// Alias for backwards compatibility
export const BUG_HISTORY_FIELD_LABELS = BUG_FIELD_LABELS;

// ============================================
// Zod Schemas
// ============================================

export const createBugHistorySchema = z.object({
  bugId: z.bigint().or(z.number().transform((n) => BigInt(n))),
  changedById: z.bigint().or(z.number().transform((n) => BigInt(n))),
  fieldName: z.string().min(1).max(50),
  oldValue: z.string().optional().nullable(),
  newValue: z.string().optional().nullable(),
});

// ============================================
// Types
// ============================================

export type CreateBugHistoryInput = z.infer<typeof createBugHistorySchema>;

export interface BugHistory {
  id: bigint;
  bugId: bigint;
  changedById: bigint;
  fieldName: string;
  oldValue: string | null;
  newValue: string | null;
  changedAt: Date;
}

export interface BugHistoryWithRelations extends BugHistory {
  changedBy?: { id: bigint; name: string; email: string };
}

// ============================================
// Validation Functions
// ============================================

export function validateCreateBugHistoryInput(input: unknown): {
  valid: boolean;
  data?: CreateBugHistoryInput;
  error?: string;
} {
  const result = createBugHistorySchema.safeParse(input);
  if (result.success) {
    return { valid: true, data: result.data };
  }
  return { valid: false, error: result.error.issues[0]?.message };
}

// ============================================
// Helper Functions
// ============================================

export function getFieldLabel(fieldName: string): string {
  return BUG_FIELD_LABELS[fieldName] || fieldName;
}

export function formatFieldValue(fieldName: string, value: string | null): string {
  if (value === null || value === '') {
    return '(なし)';
  }

  switch (fieldName) {
    case 'status':
      return BugStatusLabels[value as keyof typeof BugStatusLabels] || value;
    case 'priority':
      return BugPriorityLabels[value as keyof typeof BugPriorityLabels] || value;
    case 'severity':
      return BugSeverityLabels[value as keyof typeof BugSeverityLabels] || value;
    case 'type':
      return BugTypeLabels[value as keyof typeof BugTypeLabels] || value;
    case 'dueDate':
      try {
        return new Date(value).toLocaleDateString('ja-JP');
      } catch {
        return value;
      }
    default:
      // 長いテキストは省略
      if (value.length > 100) {
        return value.substring(0, 100) + '...';
      }
      return value;
  }
}

/**
 * 変更履歴を作成するためのヘルパー
 */
export function createHistoryEntries(
  bugId: bigint,
  changedById: bigint,
  oldValues: Record<string, unknown>,
  newValues: Record<string, unknown>
): CreateBugHistoryInput[] {
  const entries: CreateBugHistoryInput[] = [];

  for (const [key, newValue] of Object.entries(newValues)) {
    const oldValue = oldValues[key];

    // 値が変更された場合のみ履歴を作成
    if (JSON.stringify(oldValue) !== JSON.stringify(newValue)) {
      entries.push({
        bugId,
        changedById,
        fieldName: key,
        oldValue: oldValue !== null && oldValue !== undefined ? String(oldValue) : null,
        newValue: newValue !== null && newValue !== undefined ? String(newValue) : null,
      });
    }
  }

  return entries;
}
