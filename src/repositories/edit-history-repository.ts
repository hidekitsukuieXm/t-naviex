/**
 * Edit History Repository
 *
 * テストケース編集履歴のリポジトリ
 */

import { prisma } from '@/lib/prisma';
import {
  EditHistory,
  EditOperationType,
  FieldChange,
  ComparisonResult,
  DiffResult,
  getFieldLabel,
  computeFieldDiff,
  generateEditSummary,
} from '@/types/edit-history';

// ====================================
// Edit History CRUD
// ====================================

/**
 * 編集履歴を作成
 */
export async function createEditHistory(
  testCaseId: string,
  data: {
    operation: EditOperationType;
    fieldChanges: FieldChange[];
    summary?: string;
    editedBy?: string;
  }
): Promise<EditHistory> {
  const summary = data.summary || generateEditSummary(data.operation, data.fieldChanges);

  const history = await prisma.testCaseEditHistory.create({
    data: {
      testCaseId: BigInt(testCaseId),
      operation: data.operation,
      fieldChanges: data.fieldChanges as unknown as object,
      summary,
      editedBy: data.editedBy ? BigInt(data.editedBy) : null,
    },
    include: {
      testCase: {
        select: { id: true },
      },
    },
  });

  // ユーザー情報を取得（editedByがある場合）
  let editedByName: string | undefined;
  if (history.editedBy) {
    const user = await prisma.user.findUnique({
      where: { id: history.editedBy },
      select: { name: true },
    });
    editedByName = user?.name;
  }

  return {
    id: history.id.toString(),
    testCaseId: history.testCaseId.toString(),
    operation: history.operation as EditOperationType,
    fieldChanges: history.fieldChanges as unknown as FieldChange[],
    summary: history.summary || undefined,
    editedBy: history.editedBy?.toString(),
    editedByName,
    editedAt: history.editedAt,
  };
}

/**
 * 編集履歴を取得
 */
export async function getEditHistory(historyId: string): Promise<EditHistory | null> {
  const history = await prisma.testCaseEditHistory.findUnique({
    where: { id: BigInt(historyId) },
  });

  if (!history) return null;

  // ユーザー情報を取得
  let editedByName: string | undefined;
  if (history.editedBy) {
    const user = await prisma.user.findUnique({
      where: { id: history.editedBy },
      select: { name: true },
    });
    editedByName = user?.name;
  }

  return {
    id: history.id.toString(),
    testCaseId: history.testCaseId.toString(),
    operation: history.operation as EditOperationType,
    fieldChanges: history.fieldChanges as unknown as FieldChange[],
    summary: history.summary || undefined,
    editedBy: history.editedBy?.toString(),
    editedByName,
    editedAt: history.editedAt,
  };
}

/**
 * テストケースの編集履歴一覧を取得
 */
export async function getEditHistories(
  testCaseId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ histories: EditHistory[]; total: number }> {
  const [histories, total] = await Promise.all([
    prisma.testCaseEditHistory.findMany({
      where: { testCaseId: BigInt(testCaseId) },
      orderBy: { editedAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.testCaseEditHistory.count({
      where: { testCaseId: BigInt(testCaseId) },
    }),
  ]);

  // ユーザー情報を一括取得
  const userIds = histories.filter((h) => h.editedBy !== null).map((h) => h.editedBy as bigint);

  const users =
    userIds.length > 0
      ? await prisma.user.findMany({
          where: { id: { in: userIds } },
          select: { id: true, name: true },
        })
      : [];

  const userMap = new Map(users.map((u) => [u.id.toString(), u.name]));

  return {
    histories: histories.map((h) => ({
      id: h.id.toString(),
      testCaseId: h.testCaseId.toString(),
      operation: h.operation as EditOperationType,
      fieldChanges: h.fieldChanges as unknown as FieldChange[],
      summary: h.summary || undefined,
      editedBy: h.editedBy?.toString(),
      editedByName: h.editedBy ? userMap.get(h.editedBy.toString()) : undefined,
      editedAt: h.editedAt,
    })),
    total,
  };
}

// ====================================
// Change Detection
// ====================================

/**
 * テストケースの変更を検出
 */
export function detectChanges(
  previous: Record<string, unknown>,
  current: Record<string, unknown>,
  fieldsToCompare?: string[]
): FieldChange[] {
  const changes: FieldChange[] = [];
  const fields = fieldsToCompare || [
    'title',
    'description',
    'preconditions',
    'expectedResult',
    'checkpoint',
    'scenario',
    'testEnvironment',
    'notes',
    'priority',
    'testType',
    'testTechnique',
    'estimatedTime',
    'classification',
    'referenceId',
    'sectionId',
    'isMatrix',
    'sortOrder',
  ];

  for (const field of fields) {
    const prevValue = previous[field];
    const currValue = current[field];

    // 配列の比較
    if (Array.isArray(prevValue) && Array.isArray(currValue)) {
      const prevStr = JSON.stringify([...prevValue].sort());
      const currStr = JSON.stringify([...currValue].sort());
      if (prevStr !== currStr) {
        changes.push({
          field,
          fieldLabel: getFieldLabel(field),
          previousValue: prevValue,
          newValue: currValue,
        });
      }
    } else if (JSON.stringify(prevValue) !== JSON.stringify(currValue)) {
      changes.push({
        field,
        fieldLabel: getFieldLabel(field),
        previousValue: prevValue,
        newValue: currValue,
      });
    }
  }

  return changes;
}

/**
 * テストステップの変更を検出
 */
export function detectStepChanges(
  previousSteps: Array<{ stepNo: number; actionMd: string; expectedMd?: string | null }>,
  currentSteps: Array<{ stepNo: number; actionMd: string; expectedMd?: string | null }>
): FieldChange[] {
  const changes: FieldChange[] = [];

  // ステップ数が変更された場合
  if (previousSteps.length !== currentSteps.length) {
    changes.push({
      field: 'steps',
      fieldLabel: getFieldLabel('steps'),
      previousValue: `${previousSteps.length}件のステップ`,
      newValue: `${currentSteps.length}件のステップ`,
    });
    return changes;
  }

  // 各ステップを比較
  for (let i = 0; i < previousSteps.length; i++) {
    const prev = previousSteps[i];
    const curr = currentSteps[i];

    if (prev.actionMd !== curr.actionMd || prev.expectedMd !== curr.expectedMd) {
      changes.push({
        field: `steps[${i}]`,
        fieldLabel: `ステップ ${prev.stepNo}`,
        previousValue: { action: prev.actionMd, expected: prev.expectedMd },
        newValue: { action: curr.actionMd, expected: curr.expectedMd },
      });
    }
  }

  return changes;
}

// ====================================
// Comparison
// ====================================

/**
 * 2つの編集履歴を比較
 */
export async function compareEditHistories(
  sourceHistoryId: string,
  targetHistoryId: string
): Promise<ComparisonResult | null> {
  const [source, target] = await Promise.all([
    getEditHistory(sourceHistoryId),
    getEditHistory(targetHistoryId),
  ]);

  if (!source || !target) return null;

  const diffs: DiffResult[] = [];

  // 各フィールド変更を比較用に収集
  const sourceFields = new Map<string, { prev?: unknown; new?: unknown }>();
  const targetFields = new Map<string, { prev?: unknown; new?: unknown }>();

  for (const change of source.fieldChanges) {
    sourceFields.set(change.field, {
      prev: change.previousValue,
      new: change.newValue,
    });
  }

  for (const change of target.fieldChanges) {
    targetFields.set(change.field, {
      prev: change.previousValue,
      new: change.newValue,
    });
  }

  // すべてのフィールドを収集
  const allFields = new Set([...sourceFields.keys(), ...targetFields.keys()]);

  for (const field of allFields) {
    const sourceChange = sourceFields.get(field);
    const targetChange = targetFields.get(field);

    // 差分を計算
    const prevValue = targetChange?.new ?? targetChange?.prev;
    const currValue = sourceChange?.new ?? sourceChange?.prev;

    const diff = computeFieldDiff(field, prevValue, currValue);
    if (diff.hasChanges) {
      diffs.push(diff);
    }
  }

  // サマリーを計算
  let addedFields = 0;
  let removedFields = 0;
  let modifiedFields = 0;

  for (const diff of diffs) {
    if (!diff.previousValue && diff.currentValue) {
      addedFields++;
    } else if (diff.previousValue && !diff.currentValue) {
      removedFields++;
    } else {
      modifiedFields++;
    }
  }

  return {
    sourceId: sourceHistoryId,
    targetId: targetHistoryId,
    diffs,
    summary: {
      addedFields,
      removedFields,
      modifiedFields,
      totalChanges: addedFields + removedFields + modifiedFields,
    },
  };
}

/**
 * テストケースバージョン間の差分を取得
 */
export async function compareTestCaseSnapshots(
  testCaseId: string,
  sourceVersionId: string,
  targetVersionId: string
): Promise<ComparisonResult | null> {
  const [sourceVersion, targetVersion] = await Promise.all([
    prisma.testCaseVersion.findUnique({
      where: { id: BigInt(sourceVersionId) },
    }),
    prisma.testCaseVersion.findUnique({
      where: { id: BigInt(targetVersionId) },
    }),
  ]);

  if (!sourceVersion || !targetVersion) return null;

  const sourceContent = sourceVersion.content as Record<string, unknown>;
  const targetContent = targetVersion.content as Record<string, unknown>;

  const diffs: DiffResult[] = [];
  const fieldsToCompare = [
    'title',
    'description',
    'preconditions',
    'expectedResult',
    'checkpoint',
    'scenario',
    'testEnvironment',
    'notes',
    'priority',
    'testType',
    'testTechnique',
    'estimatedTime',
    'tags',
  ];

  for (const field of fieldsToCompare) {
    const diff = computeFieldDiff(field, targetContent[field], sourceContent[field]);
    if (diff.hasChanges) {
      diffs.push(diff);
    }
  }

  // ステップの差分も計算
  const sourceSteps =
    (sourceContent.steps as Array<{ action: string; expectedResult: string }>) || [];
  const targetSteps =
    (targetContent.steps as Array<{ action: string; expectedResult: string }>) || [];

  if (JSON.stringify(sourceSteps) !== JSON.stringify(targetSteps)) {
    diffs.push({
      fieldName: 'steps',
      fieldLabel: 'テストステップ',
      previousValue: JSON.stringify(targetSteps, null, 2),
      currentValue: JSON.stringify(sourceSteps, null, 2),
      hasChanges: true,
    });
  }

  // サマリーを計算
  let addedFields = 0;
  let removedFields = 0;
  let modifiedFields = 0;

  for (const diff of diffs) {
    if (!diff.previousValue && diff.currentValue) {
      addedFields++;
    } else if (diff.previousValue && !diff.currentValue) {
      removedFields++;
    } else {
      modifiedFields++;
    }
  }

  return {
    sourceId: sourceVersionId,
    targetId: targetVersionId,
    diffs,
    summary: {
      addedFields,
      removedFields,
      modifiedFields,
      totalChanges: addedFields + removedFields + modifiedFields,
    },
  };
}

// ====================================
// Auto-record helpers
// ====================================

/**
 * テストケース更新時に自動的に編集履歴を記録
 */
export async function recordTestCaseUpdate(
  testCaseId: string,
  previousData: Record<string, unknown>,
  currentData: Record<string, unknown>,
  editedBy?: string
): Promise<EditHistory | null> {
  const fieldChanges = detectChanges(previousData, currentData);

  if (fieldChanges.length === 0) {
    return null; // 変更がない場合は記録しない
  }

  return createEditHistory(testCaseId, {
    operation: EditOperationType.UPDATE,
    fieldChanges,
    editedBy,
  });
}

/**
 * テストケース作成時に編集履歴を記録
 */
export async function recordTestCaseCreate(
  testCaseId: string,
  data: Record<string, unknown>,
  editedBy?: string
): Promise<EditHistory> {
  const fieldChanges: FieldChange[] = Object.entries(data)
    .filter(([, value]) => value !== null && value !== undefined)
    .map(([field, value]) => ({
      field,
      fieldLabel: getFieldLabel(field),
      previousValue: undefined,
      newValue: value,
    }));

  return createEditHistory(testCaseId, {
    operation: EditOperationType.CREATE,
    fieldChanges,
    editedBy,
  });
}

/**
 * テストケース削除時に編集履歴を記録
 */
export async function recordTestCaseDelete(
  testCaseId: string,
  editedBy?: string
): Promise<EditHistory> {
  return createEditHistory(testCaseId, {
    operation: EditOperationType.DELETE,
    fieldChanges: [],
    editedBy,
  });
}

/**
 * テストケース復元時に編集履歴を記録
 */
export async function recordTestCaseRestore(
  testCaseId: string,
  restoredFromVersion: number,
  editedBy?: string
): Promise<EditHistory> {
  return createEditHistory(testCaseId, {
    operation: EditOperationType.RESTORE,
    fieldChanges: [],
    summary: `バージョン ${restoredFromVersion} から復元しました`,
    editedBy,
  });
}
