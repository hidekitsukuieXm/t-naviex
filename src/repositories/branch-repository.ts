/**
 * Branch Repository
 *
 * テスト仕様書ブランチ管理のリポジトリ
 */

import { prisma } from '@/lib/prisma';
import { v4 as uuidv4 } from 'uuid';
import {
  Branch,
  BranchSnapshot,
  MergeRequest,
  MergeConflict,
  TestCaseSnapshot,
  BranchComparison,
  TestCaseModification,
  BranchHistory,
  BranchStatus,
  BranchType,
  MergeStatus,
  ConflictType,
  ResolutionType,
  calculateTestCaseChecksum,
  compareTestCases,
} from '@/types/branch';

// ====================================
// Branch Operations
// ====================================

/**
 * ブランチを作成
 */
export async function createBranch(
  testSpecId: string,
  userId: string,
  data: {
    name: string;
    description?: string;
    type: BranchType;
    parentBranchId?: string;
    copyTestCases?: boolean;
  }
): Promise<Branch> {
  const id = uuidv4();

  const branch = await prisma.testSpecBranch.create({
    data: {
      id,
      testSpecId: BigInt(testSpecId),
      name: data.name,
      description: data.description,
      type: data.type,
      status: BranchStatus.ACTIVE,
      parentBranchId: data.parentBranchId,
      createdBy: BigInt(userId),
      metadata: {},
    },
  });

  // 親ブランチからテストケースをコピー
  if (data.copyTestCases && data.parentBranchId) {
    await copyTestCasesFromBranch(id, data.parentBranchId, userId);
  }

  // 履歴を記録
  await recordBranchHistory(
    testSpecId,
    id,
    userId,
    'CREATE',
    `ブランチ「${data.name}」を作成しました`
  );

  return {
    id: branch.id,
    testSpecId: branch.testSpecId.toString(),
    name: branch.name,
    description: branch.description || undefined,
    type: branch.type as BranchType,
    status: branch.status as BranchStatus,
    parentBranchId: branch.parentBranchId || undefined,
    createdBy: branch.createdBy.toString(),
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
    metadata: branch.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * 親ブランチからテストケースをコピー
 */
async function copyTestCasesFromBranch(
  targetBranchId: string,
  sourceBranchId: string,
  userId: string
): Promise<void> {
  // ソースブランチの最新スナップショットを取得
  const latestSnapshot = await prisma.branchSnapshot.findFirst({
    where: { branchId: sourceBranchId },
    orderBy: { version: 'desc' },
  });

  if (latestSnapshot) {
    const testCases = latestSnapshot.testCases as unknown as TestCaseSnapshot[];

    // 新しいブランチにスナップショットを作成
    await prisma.branchSnapshot.create({
      data: {
        id: uuidv4(),
        branchId: targetBranchId,
        version: 1,
        commitMessage: `親ブランチからコピー`,
        testCases: testCases as unknown as object,
        createdBy: BigInt(userId),
        metadata: {},
      },
    });
  }
}

/**
 * ブランチを取得
 */
export async function getBranch(id: string): Promise<Branch | null> {
  const branch = await prisma.testSpecBranch.findUnique({
    where: { id },
  });

  if (!branch) return null;

  return {
    id: branch.id,
    testSpecId: branch.testSpecId.toString(),
    name: branch.name,
    description: branch.description || undefined,
    type: branch.type as BranchType,
    status: branch.status as BranchStatus,
    parentBranchId: branch.parentBranchId || undefined,
    createdBy: branch.createdBy.toString(),
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
    metadata: branch.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * テスト仕様書のブランチ一覧を取得
 */
export async function getBranches(
  testSpecId: string,
  options?: {
    status?: BranchStatus;
    type?: BranchType;
    limit?: number;
    offset?: number;
  }
): Promise<{ branches: Branch[]; total: number }> {
  const where = {
    testSpecId: BigInt(testSpecId),
    ...(options?.status && { status: options.status }),
    ...(options?.type && { type: options.type }),
  };

  const [branches, total] = await Promise.all([
    prisma.testSpecBranch.findMany({
      where,
      orderBy: [{ type: 'asc' }, { createdAt: 'desc' }],
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.testSpecBranch.count({ where }),
  ]);

  return {
    branches: branches.map((b) => ({
      id: b.id,
      testSpecId: b.testSpecId.toString(),
      name: b.name,
      description: b.description || undefined,
      type: b.type as BranchType,
      status: b.status as BranchStatus,
      parentBranchId: b.parentBranchId || undefined,
      createdBy: b.createdBy.toString(),
      createdAt: b.createdAt,
      updatedAt: b.updatedAt,
      metadata: b.metadata as Record<string, unknown> | undefined,
    })),
    total,
  };
}

/**
 * ブランチを更新
 */
export async function updateBranch(
  id: string,
  userId: string,
  data: {
    name?: string;
    description?: string;
    status?: BranchStatus;
    metadata?: Record<string, unknown>;
  }
): Promise<Branch | null> {
  const branch = await prisma.testSpecBranch.update({
    where: { id },
    data: {
      ...(data.name && { name: data.name }),
      ...(data.description !== undefined && { description: data.description }),
      ...(data.status && { status: data.status }),
      ...(data.metadata && { metadata: data.metadata as object }),
    },
  });

  // ステータス変更時は履歴を記録
  if (data.status) {
    await recordBranchHistory(
      branch.testSpecId.toString(),
      id,
      userId,
      data.status === BranchStatus.FROZEN ? 'FREEZE' : 'UPDATE',
      `ブランチ「${branch.name}」のステータスを${data.status}に変更しました`
    );
  }

  return {
    id: branch.id,
    testSpecId: branch.testSpecId.toString(),
    name: branch.name,
    description: branch.description || undefined,
    type: branch.type as BranchType,
    status: branch.status as BranchStatus,
    parentBranchId: branch.parentBranchId || undefined,
    createdBy: branch.createdBy.toString(),
    createdAt: branch.createdAt,
    updatedAt: branch.updatedAt,
    metadata: branch.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * ブランチを削除
 */
export async function deleteBranch(id: string, userId: string): Promise<void> {
  const branch = await prisma.testSpecBranch.findUnique({
    where: { id },
    select: { testSpecId: true, name: true },
  });

  if (!branch) return;

  // ソフトデリート
  await prisma.testSpecBranch.update({
    where: { id },
    data: { status: BranchStatus.DELETED },
  });

  // 履歴を記録
  await recordBranchHistory(
    branch.testSpecId.toString(),
    id,
    userId,
    'DELETE',
    `ブランチ「${branch.name}」を削除しました`
  );
}

// ====================================
// Snapshot Operations
// ====================================

/**
 * スナップショットを作成（コミット）
 */
export async function createSnapshot(
  branchId: string,
  userId: string,
  data: {
    commitMessage: string;
    testCases: Omit<TestCaseSnapshot, 'checksum'>[];
  }
): Promise<BranchSnapshot> {
  // 最新バージョンを取得
  const latestSnapshot = await prisma.branchSnapshot.findFirst({
    where: { branchId },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const nextVersion = (latestSnapshot?.version || 0) + 1;

  // チェックサムを計算
  const testCasesWithChecksum: TestCaseSnapshot[] = data.testCases.map((tc) => ({
    ...tc,
    checksum: calculateTestCaseChecksum(tc),
  }));

  const id = uuidv4();

  const snapshot = await prisma.branchSnapshot.create({
    data: {
      id,
      branchId,
      version: nextVersion,
      commitMessage: data.commitMessage,
      testCases: testCasesWithChecksum as unknown as object,
      createdBy: BigInt(userId),
      metadata: {},
    },
  });

  return {
    id: snapshot.id,
    branchId: snapshot.branchId,
    version: snapshot.version,
    commitMessage: snapshot.commitMessage,
    testCases: snapshot.testCases as unknown as TestCaseSnapshot[],
    createdBy: snapshot.createdBy.toString(),
    createdAt: snapshot.createdAt,
    metadata: snapshot.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * ブランチの最新スナップショットを取得
 */
export async function getLatestSnapshot(branchId: string): Promise<BranchSnapshot | null> {
  const snapshot = await prisma.branchSnapshot.findFirst({
    where: { branchId },
    orderBy: { version: 'desc' },
  });

  if (!snapshot) return null;

  return {
    id: snapshot.id,
    branchId: snapshot.branchId,
    version: snapshot.version,
    commitMessage: snapshot.commitMessage,
    testCases: snapshot.testCases as unknown as TestCaseSnapshot[],
    createdBy: snapshot.createdBy.toString(),
    createdAt: snapshot.createdAt,
    metadata: snapshot.metadata as Record<string, unknown> | undefined,
  };
}

/**
 * スナップショット履歴を取得
 */
export async function getSnapshotHistory(
  branchId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ snapshots: BranchSnapshot[]; total: number }> {
  const [snapshots, total] = await Promise.all([
    prisma.branchSnapshot.findMany({
      where: { branchId },
      orderBy: { version: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.branchSnapshot.count({ where: { branchId } }),
  ]);

  return {
    snapshots: snapshots.map((s) => ({
      id: s.id,
      branchId: s.branchId,
      version: s.version,
      commitMessage: s.commitMessage,
      testCases: s.testCases as unknown as TestCaseSnapshot[],
      createdBy: s.createdBy.toString(),
      createdAt: s.createdAt,
      metadata: s.metadata as Record<string, unknown> | undefined,
    })),
    total,
  };
}

// ====================================
// Branch Comparison
// ====================================

/**
 * ブランチを比較
 */
export async function compareBranches(
  sourceBranchId: string,
  targetBranchId: string
): Promise<BranchComparison> {
  const [sourceSnapshot, targetSnapshot] = await Promise.all([
    getLatestSnapshot(sourceBranchId),
    getLatestSnapshot(targetBranchId),
  ]);

  const sourceTestCases = sourceSnapshot?.testCases || [];
  const targetTestCases = targetSnapshot?.testCases || [];

  const sourceIds = new Set(sourceTestCases.map((tc) => tc.testCaseId));
  const targetIds = new Set(targetTestCases.map((tc) => tc.testCaseId));

  // 追加されたテストケース（ソースにあってターゲットにない）
  const addedTestCases = sourceTestCases.filter((tc) => !targetIds.has(tc.testCaseId));

  // 削除されたテストケース（ターゲットにあってソースにない）
  const removedTestCases = targetTestCases.filter((tc) => !sourceIds.has(tc.testCaseId));

  // 変更されたテストケース
  const modifiedTestCases: TestCaseModification[] = [];
  let unchangedCount = 0;

  sourceTestCases.forEach((sourceTC) => {
    const targetTC = targetTestCases.find((tc) => tc.testCaseId === sourceTC.testCaseId);
    if (targetTC) {
      const comparison = compareTestCases(sourceTC, targetTC);
      if (!comparison.equal) {
        modifiedTestCases.push({
          testCaseId: sourceTC.testCaseId,
          testCaseName: sourceTC.title,
          sourceSnapshot: sourceTC,
          targetSnapshot: targetTC,
          changes: comparison.changes,
        });
      } else {
        unchangedCount++;
      }
    }
  });

  return {
    sourceBranchId,
    targetBranchId,
    addedTestCases,
    removedTestCases,
    modifiedTestCases,
    unchangedCount,
  };
}

// ====================================
// Merge Operations
// ====================================

/**
 * マージリクエストを作成
 */
export async function createMergeRequest(
  testSpecId: string,
  userId: string,
  data: {
    sourceBranchId: string;
    targetBranchId: string;
    title: string;
    description?: string;
  }
): Promise<MergeRequest> {
  const id = uuidv4();

  // ブランチを比較してコンフリクトを検出
  const comparison = await compareBranches(data.sourceBranchId, data.targetBranchId);
  const conflicts = detectConflicts(comparison);

  const status = conflicts.length > 0 ? MergeStatus.CONFLICT : MergeStatus.PENDING;

  const mergeRequest = await prisma.mergeRequest.create({
    data: {
      id,
      testSpecId: BigInt(testSpecId),
      sourceBranchId: data.sourceBranchId,
      targetBranchId: data.targetBranchId,
      title: data.title,
      description: data.description,
      status,
      conflicts: conflicts as unknown as object,
      createdBy: BigInt(userId),
      metadata: {},
    },
    include: {
      sourceBranch: true,
      targetBranch: true,
    },
  });

  return {
    id: mergeRequest.id,
    testSpecId: mergeRequest.testSpecId.toString(),
    sourceBranchId: mergeRequest.sourceBranchId,
    targetBranchId: mergeRequest.targetBranchId,
    title: mergeRequest.title,
    description: mergeRequest.description || undefined,
    status: mergeRequest.status as MergeStatus,
    conflicts: mergeRequest.conflicts as unknown as MergeConflict[],
    createdBy: mergeRequest.createdBy.toString(),
    createdAt: mergeRequest.createdAt,
    mergedAt: mergeRequest.mergedAt || undefined,
    mergedBy: mergeRequest.mergedBy?.toString(),
  };
}

/**
 * コンフリクトを検出
 */
function detectConflicts(comparison: BranchComparison): MergeConflict[] {
  const conflicts: MergeConflict[] = [];

  // 変更されたテストケースをコンフリクトとして扱う
  comparison.modifiedTestCases.forEach((mod) => {
    conflicts.push({
      id: uuidv4(),
      testCaseId: mod.testCaseId,
      testCaseName: mod.testCaseName,
      conflictType: ConflictType.CONTENT_MODIFIED,
      sourceContent: mod.sourceSnapshot,
      targetContent: mod.targetSnapshot,
      isResolved: false,
    });
  });

  return conflicts;
}

/**
 * マージリクエストを取得
 */
export async function getMergeRequest(id: string): Promise<MergeRequest | null> {
  const mergeRequest = await prisma.mergeRequest.findUnique({
    where: { id },
  });

  if (!mergeRequest) return null;

  return {
    id: mergeRequest.id,
    testSpecId: mergeRequest.testSpecId.toString(),
    sourceBranchId: mergeRequest.sourceBranchId,
    targetBranchId: mergeRequest.targetBranchId,
    title: mergeRequest.title,
    description: mergeRequest.description || undefined,
    status: mergeRequest.status as MergeStatus,
    conflicts: (mergeRequest.conflicts as unknown as MergeConflict[]) || [],
    createdBy: mergeRequest.createdBy.toString(),
    createdAt: mergeRequest.createdAt,
    mergedAt: mergeRequest.mergedAt || undefined,
    mergedBy: mergeRequest.mergedBy?.toString(),
  };
}

/**
 * マージリクエスト一覧を取得
 */
export async function getMergeRequests(
  testSpecId: string,
  options?: {
    status?: MergeStatus;
    limit?: number;
    offset?: number;
  }
): Promise<{ mergeRequests: MergeRequest[]; total: number }> {
  const where = {
    testSpecId: BigInt(testSpecId),
    ...(options?.status && { status: options.status }),
  };

  const [mergeRequests, total] = await Promise.all([
    prisma.mergeRequest.findMany({
      where,
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.mergeRequest.count({ where }),
  ]);

  return {
    mergeRequests: mergeRequests.map((mr) => ({
      id: mr.id,
      testSpecId: mr.testSpecId.toString(),
      sourceBranchId: mr.sourceBranchId,
      targetBranchId: mr.targetBranchId,
      title: mr.title,
      description: mr.description || undefined,
      status: mr.status as MergeStatus,
      conflicts: (mr.conflicts as unknown as MergeConflict[]) || [],
      createdBy: mr.createdBy.toString(),
      createdAt: mr.createdAt,
      mergedAt: mr.mergedAt || undefined,
      mergedBy: mr.mergedBy?.toString(),
    })),
    total,
  };
}

/**
 * コンフリクトを解決
 */
export async function resolveConflict(
  mergeRequestId: string,
  userId: string,
  data: {
    conflictId: string;
    resolutionType: ResolutionType;
    resolvedContent?: TestCaseSnapshot;
    comment?: string;
  }
): Promise<MergeRequest | null> {
  const mergeRequest = await getMergeRequest(mergeRequestId);
  if (!mergeRequest) return null;

  const conflicts = mergeRequest.conflicts.map((conflict) => {
    if (conflict.id === data.conflictId) {
      return {
        ...conflict,
        isResolved: true,
        resolution: {
          type: data.resolutionType,
          resolvedContent: data.resolvedContent,
          resolvedBy: userId,
          resolvedAt: new Date(),
          comment: data.comment,
        },
      };
    }
    return conflict;
  });

  // 全コンフリクト解決済みかチェック
  const allResolved = conflicts.every((c) => c.isResolved);
  const newStatus = allResolved ? MergeStatus.PENDING : MergeStatus.CONFLICT;

  await prisma.mergeRequest.update({
    where: { id: mergeRequestId },
    data: {
      conflicts: conflicts as unknown as object,
      status: newStatus,
    },
  });

  return getMergeRequest(mergeRequestId);
}

/**
 * マージを実行
 */
export async function executeMerge(
  mergeRequestId: string,
  userId: string
): Promise<MergeRequest | null> {
  const mergeRequest = await getMergeRequest(mergeRequestId);
  if (!mergeRequest) return null;

  // コンフリクトが解決されていない場合はエラー
  const unresolvedConflicts = mergeRequest.conflicts.filter((c) => !c.isResolved);
  if (unresolvedConflicts.length > 0) {
    throw new Error('未解決のコンフリクトがあります');
  }

  // ソースブランチの最新スナップショットを取得
  const sourceSnapshot = await getLatestSnapshot(mergeRequest.sourceBranchId);
  if (!sourceSnapshot) {
    throw new Error('ソースブランチにスナップショットがありません');
  }

  // 解決されたコンテンツを反映
  let mergedTestCases = sourceSnapshot.testCases;

  mergeRequest.conflicts.forEach((conflict) => {
    if (conflict.resolution) {
      if (conflict.resolution.type === ResolutionType.USE_TARGET) {
        // ターゲットの内容を使用
        mergedTestCases = mergedTestCases.filter((tc) => tc.testCaseId !== conflict.testCaseId);
        mergedTestCases.push(conflict.targetContent);
      } else if (
        conflict.resolution.type === ResolutionType.MANUAL_MERGE &&
        conflict.resolution.resolvedContent
      ) {
        // 手動マージ結果を使用
        mergedTestCases = mergedTestCases.filter((tc) => tc.testCaseId !== conflict.testCaseId);
        mergedTestCases.push(conflict.resolution.resolvedContent);
      }
      // USE_SOURCE の場合はそのまま
    }
  });

  // ターゲットブランチに新しいスナップショットを作成
  await createSnapshot(mergeRequest.targetBranchId, userId, {
    commitMessage: `Merge from ${mergeRequest.title}`,
    testCases: mergedTestCases.map((tc) => ({
      testCaseId: tc.testCaseId,
      title: tc.title,
      description: tc.description,
      preconditions: tc.preconditions,
      steps: tc.steps,
      expectedResult: tc.expectedResult,
      priority: tc.priority,
      testType: tc.testType,
      tags: tc.tags,
    })),
  });

  // ソースブランチをマージ済みに更新
  await prisma.testSpecBranch.update({
    where: { id: mergeRequest.sourceBranchId },
    data: { status: BranchStatus.MERGED },
  });

  // マージリクエストを完了に更新
  await prisma.mergeRequest.update({
    where: { id: mergeRequestId },
    data: {
      status: MergeStatus.COMPLETED,
      mergedAt: new Date(),
      mergedBy: BigInt(userId),
    },
  });

  // 履歴を記録
  const sourceBranch = await getBranch(mergeRequest.sourceBranchId);
  const targetBranch = await getBranch(mergeRequest.targetBranchId);

  await recordBranchHistory(
    mergeRequest.testSpecId,
    mergeRequest.targetBranchId,
    userId,
    'MERGE',
    `ブランチ「${sourceBranch?.name}」を「${targetBranch?.name}」にマージしました`
  );

  return getMergeRequest(mergeRequestId);
}

/**
 * マージリクエストをキャンセル
 */
export async function cancelMergeRequest(mergeRequestId: string): Promise<MergeRequest | null> {
  await prisma.mergeRequest.update({
    where: { id: mergeRequestId },
    data: { status: MergeStatus.CANCELLED },
  });

  return getMergeRequest(mergeRequestId);
}

// ====================================
// Branch History
// ====================================

/**
 * ブランチ履歴を記録
 */
async function recordBranchHistory(
  testSpecId: string,
  branchId: string,
  userId: string,
  action: string,
  description: string
): Promise<void> {
  // プロジェクトIDを取得
  const testSpec = await prisma.testSpec.findUnique({
    where: { id: BigInt(testSpecId) },
    select: { projectId: true },
  });

  if (!testSpec) return;

  await prisma.branchHistory.create({
    data: {
      id: uuidv4(),
      projectId: testSpec.projectId,
      branchId,
      action,
      description,
      userId: BigInt(userId),
      metadata: {},
    },
  });
}

/**
 * ブランチ履歴を取得
 */
export async function getBranchHistory(
  branchId: string,
  options?: { limit?: number; offset?: number }
): Promise<{ histories: BranchHistory[]; total: number }> {
  const [histories, total] = await Promise.all([
    prisma.branchHistory.findMany({
      where: { branchId },
      orderBy: { timestamp: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
    }),
    prisma.branchHistory.count({ where: { branchId } }),
  ]);

  return {
    histories: histories.map((h) => ({
      id: h.id,
      branchId: h.branchId,
      action: h.action as 'CREATE' | 'UPDATE' | 'MERGE' | 'DELETE' | 'FREEZE',
      description: h.description,
      userId: h.userId.toString(),
      timestamp: h.timestamp,
      metadata: h.metadata as Record<string, unknown> | undefined,
    })),
    total,
  };
}

/**
 * マスターブランチを初期化（テスト仕様書作成時）
 */
export async function initializeMasterBranch(testSpecId: string, userId: string): Promise<Branch> {
  return createBranch(testSpecId, userId, {
    name: 'master',
    description: 'メインブランチ',
    type: BranchType.MASTER,
  });
}
