/**
 * ベースラインリポジトリ
 */

import prisma from '@/lib/prisma';
import type {
  Baseline,
  BaselineDetail,
  BaselineWithStats,
  CreateBaselineInput,
  UpdateBaselineInput,
  BaselineStatus,
  TestCaseSnapshotData,
  TestStepSnapshotData,
  BaselineComparisonResult,
  BaselineItemInfo,
} from '@/types/baseline';
import { generateChecksum } from '@/types/baseline';

/**
 * BigIntからstringへ変換するヘルパー
 */
function bigIntToString<T>(obj: T): T {
  if (obj === null || obj === undefined) {
    return obj;
  }
  if (typeof obj === 'bigint') {
    return obj.toString() as unknown as T;
  }
  if (Array.isArray(obj)) {
    return obj.map(bigIntToString) as unknown as T;
  }
  if (typeof obj === 'object') {
    const result: Record<string, unknown> = {};
    for (const key in obj) {
      result[key] = bigIntToString((obj as Record<string, unknown>)[key]);
    }
    return result as T;
  }
  return obj;
}

/**
 * ベースライン一覧を取得
 */
export async function getBaselines(
  testSpecId: string,
  options?: {
    search?: string;
    status?: BaselineStatus;
    sortBy?: 'name' | 'createdAt' | 'version' | 'snapshotAt';
    sortOrder?: 'asc' | 'desc';
    skip?: number;
    take?: number;
  }
): Promise<{ items: BaselineWithStats[]; total: number }> {
  const {
    search,
    status,
    sortBy = 'snapshotAt',
    sortOrder = 'desc',
    skip = 0,
    take = 50,
  } = options || {};

  const where = {
    testSpecId: BigInt(testSpecId),
    ...(search
      ? {
          OR: [
            { name: { contains: search, mode: 'insensitive' as const } },
            { description: { contains: search, mode: 'insensitive' as const } },
            { version: { contains: search, mode: 'insensitive' as const } },
          ],
        }
      : {}),
    ...(status ? { status } : {}),
  };

  const [items, total] = await Promise.all([
    prisma.baseline.findMany({
      where,
      include: {
        createdBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        approvedBy: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
      orderBy: { [sortBy]: sortOrder },
      skip,
      take,
    }),
    prisma.baseline.count({ where }),
  ]);

  return {
    items: items.map((item) =>
      bigIntToString({
        id: item.id.toString(),
        testSpecId: item.testSpecId.toString(),
        name: item.name,
        description: item.description,
        version: item.version,
        status: item.status as BaselineStatus,
        snapshotAt: item.snapshotAt,
        metadata: item.metadata as Record<string, unknown> | null,
        totalCases: item.totalCases,
        totalSteps: item.totalSteps,
        createdAt: item.createdAt,
        updatedAt: item.updatedAt,
        createdById: item.createdById.toString(),
        approvedAt: item.approvedAt,
        approvedById: item.approvedById?.toString() || null,
        createdBy: item.createdBy
          ? {
              id: item.createdBy.id.toString(),
              name: item.createdBy.name,
              email: item.createdBy.email,
            }
          : null,
        approvedBy: item.approvedBy
          ? {
              id: item.approvedBy.id.toString(),
              name: item.approvedBy.name,
              email: item.approvedBy.email,
            }
          : null,
      })
    ),
    total,
  };
}

/**
 * ベースラインを取得（詳細）
 */
export async function getBaselineById(
  testSpecId: string,
  baselineId: string
): Promise<BaselineDetail | null> {
  const baseline = await prisma.baseline.findFirst({
    where: {
      id: BigInt(baselineId),
      testSpecId: BigInt(testSpecId),
    },
    include: {
      items: {
        orderBy: { sortOrder: 'asc' },
      },
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      testSpec: {
        select: {
          id: true,
          name: true,
          version: true,
        },
      },
    },
  });

  if (!baseline) {
    return null;
  }

  return bigIntToString({
    id: baseline.id.toString(),
    testSpecId: baseline.testSpecId.toString(),
    name: baseline.name,
    description: baseline.description,
    version: baseline.version,
    status: baseline.status as BaselineStatus,
    snapshotAt: baseline.snapshotAt,
    metadata: baseline.metadata as Record<string, unknown> | null,
    totalCases: baseline.totalCases,
    totalSteps: baseline.totalSteps,
    createdAt: baseline.createdAt,
    updatedAt: baseline.updatedAt,
    createdById: baseline.createdById.toString(),
    approvedAt: baseline.approvedAt,
    approvedById: baseline.approvedById?.toString() || null,
    items: baseline.items.map((item) => ({
      id: item.id.toString(),
      baselineId: item.baselineId.toString(),
      testCaseId: item.testCaseId?.toString() || null,
      sortOrder: item.sortOrder,
      snapshotData: item.snapshotData as unknown as TestCaseSnapshotData,
      checksum: item.checksum,
      createdAt: item.createdAt,
    })),
    createdBy: baseline.createdBy
      ? {
          id: baseline.createdBy.id.toString(),
          name: baseline.createdBy.name,
          email: baseline.createdBy.email,
        }
      : null,
    approvedBy: baseline.approvedBy
      ? {
          id: baseline.approvedBy.id.toString(),
          name: baseline.approvedBy.name,
          email: baseline.approvedBy.email,
        }
      : null,
    testSpec: {
      id: baseline.testSpec.id.toString(),
      name: baseline.testSpec.name,
      version: baseline.testSpec.version,
    },
  });
}

/**
 * ベースラインを作成（テスト仕様書のスナップショットを取得）
 */
export async function createBaseline(
  testSpecId: string,
  userId: string,
  input: CreateBaselineInput
): Promise<Baseline> {
  // テスト仕様書と関連するテストケースを取得
  const testSpec = await prisma.testSpec.findUnique({
    where: { id: BigInt(testSpecId) },
    include: {
      testCases: {
        where: { deletedAt: null },
        include: {
          testSteps: {
            orderBy: { stepNo: 'asc' },
          },
          testCaseTags: {
            include: {
              tag: true,
            },
          },
        },
        orderBy: { sortOrder: 'asc' },
      },
    },
  });

  if (!testSpec) {
    throw new Error('テスト仕様書が見つかりません');
  }

  // 同一バージョンの存在確認
  const existingBaseline = await prisma.baseline.findFirst({
    where: {
      testSpecId: BigInt(testSpecId),
      version: input.version,
    },
  });

  if (existingBaseline) {
    throw new Error('このバージョンのベースラインは既に存在します');
  }

  // テストケースのスナップショットデータを作成
  const snapshotItems: {
    testCaseId: bigint;
    sortOrder: number;
    snapshotData: TestCaseSnapshotData;
    checksum: string;
  }[] = [];

  let totalSteps = 0;

  for (let i = 0; i < testSpec.testCases.length; i++) {
    const tc = testSpec.testCases[i];
    const steps: TestStepSnapshotData[] = tc.testSteps.map((step) => ({
      stepNo: step.stepNo,
      actionMd: step.actionMd,
      expectedMd: step.expectedMd,
    }));

    totalSteps += steps.length;

    const snapshotData: TestCaseSnapshotData = {
      title: tc.title,
      description: tc.description,
      preconditions: tc.preconditions,
      expectedResult: tc.expectedResult,
      checkpoint: tc.checkpoint,
      scenario: tc.scenario,
      testEnvironment: tc.testEnvironment,
      notes: tc.notes,
      priority: tc.priority,
      testType: tc.testType,
      testTechnique: tc.testTechnique,
      tags: tc.testCaseTags.map((t) => t.tag.name),
      steps,
    };

    snapshotItems.push({
      testCaseId: tc.id,
      sortOrder: i,
      snapshotData,
      checksum: generateChecksum(snapshotData),
    });
  }

  // ベースラインを作成
  const baseline = await prisma.baseline.create({
    data: {
      testSpecId: BigInt(testSpecId),
      createdById: BigInt(userId),
      name: input.name,
      description: input.description,
      version: input.version,
      status: input.status || 'DRAFT',
      metadata: input.metadata,
      totalCases: snapshotItems.length,
      totalSteps,
      items: {
        create: snapshotItems.map((item) => ({
          testCaseId: item.testCaseId,
          sortOrder: item.sortOrder,
          snapshotData: item.snapshotData,
          checksum: item.checksum,
        })),
      },
    },
  });

  return bigIntToString({
    id: baseline.id.toString(),
    testSpecId: baseline.testSpecId.toString(),
    name: baseline.name,
    description: baseline.description,
    version: baseline.version,
    status: baseline.status as BaselineStatus,
    snapshotAt: baseline.snapshotAt,
    metadata: baseline.metadata as Record<string, unknown> | null,
    totalCases: baseline.totalCases,
    totalSteps: baseline.totalSteps,
    createdAt: baseline.createdAt,
    updatedAt: baseline.updatedAt,
    createdById: baseline.createdById.toString(),
    approvedAt: baseline.approvedAt,
    approvedById: baseline.approvedById?.toString() || null,
  });
}

/**
 * ベースラインを更新
 */
export async function updateBaseline(
  testSpecId: string,
  baselineId: string,
  input: UpdateBaselineInput
): Promise<Baseline> {
  // LOCKEDまたはARCHIVEDのベースラインは更新不可
  const existing = await prisma.baseline.findFirst({
    where: {
      id: BigInt(baselineId),
      testSpecId: BigInt(testSpecId),
    },
  });

  if (!existing) {
    throw new Error('ベースラインが見つかりません');
  }

  if (existing.status === 'LOCKED' || existing.status === 'ARCHIVED') {
    throw new Error('ロックまたはアーカイブされたベースラインは更新できません');
  }

  const baseline = await prisma.baseline.update({
    where: {
      id: BigInt(baselineId),
    },
    data: {
      ...input,
    },
  });

  return bigIntToString({
    id: baseline.id.toString(),
    testSpecId: baseline.testSpecId.toString(),
    name: baseline.name,
    description: baseline.description,
    version: baseline.version,
    status: baseline.status as BaselineStatus,
    snapshotAt: baseline.snapshotAt,
    metadata: baseline.metadata as Record<string, unknown> | null,
    totalCases: baseline.totalCases,
    totalSteps: baseline.totalSteps,
    createdAt: baseline.createdAt,
    updatedAt: baseline.updatedAt,
    createdById: baseline.createdById.toString(),
    approvedAt: baseline.approvedAt,
    approvedById: baseline.approvedById?.toString() || null,
  });
}

/**
 * ベースラインを削除
 */
export async function deleteBaseline(testSpecId: string, baselineId: string): Promise<void> {
  // LOCKEDのベースラインは削除不可
  const existing = await prisma.baseline.findFirst({
    where: {
      id: BigInt(baselineId),
      testSpecId: BigInt(testSpecId),
    },
  });

  if (!existing) {
    throw new Error('ベースラインが見つかりません');
  }

  if (existing.status === 'LOCKED') {
    throw new Error('ロックされたベースラインは削除できません');
  }

  await prisma.baseline.delete({
    where: {
      id: BigInt(baselineId),
    },
  });
}

/**
 * ベースラインを承認
 */
export async function approveBaseline(
  testSpecId: string,
  baselineId: string,
  userId: string
): Promise<Baseline> {
  const existing = await prisma.baseline.findFirst({
    where: {
      id: BigInt(baselineId),
      testSpecId: BigInt(testSpecId),
    },
  });

  if (!existing) {
    throw new Error('ベースラインが見つかりません');
  }

  if (existing.status !== 'DRAFT') {
    throw new Error('下書き状態のベースラインのみ承認できます');
  }

  const baseline = await prisma.baseline.update({
    where: {
      id: BigInt(baselineId),
    },
    data: {
      status: 'APPROVED',
      approvedAt: new Date(),
      approvedById: BigInt(userId),
    },
  });

  return bigIntToString({
    id: baseline.id.toString(),
    testSpecId: baseline.testSpecId.toString(),
    name: baseline.name,
    description: baseline.description,
    version: baseline.version,
    status: baseline.status as BaselineStatus,
    snapshotAt: baseline.snapshotAt,
    metadata: baseline.metadata as Record<string, unknown> | null,
    totalCases: baseline.totalCases,
    totalSteps: baseline.totalSteps,
    createdAt: baseline.createdAt,
    updatedAt: baseline.updatedAt,
    createdById: baseline.createdById.toString(),
    approvedAt: baseline.approvedAt,
    approvedById: baseline.approvedById?.toString() || null,
  });
}

/**
 * ベースラインをロック
 */
export async function lockBaseline(testSpecId: string, baselineId: string): Promise<Baseline> {
  const existing = await prisma.baseline.findFirst({
    where: {
      id: BigInt(baselineId),
      testSpecId: BigInt(testSpecId),
    },
  });

  if (!existing) {
    throw new Error('ベースラインが見つかりません');
  }

  if (existing.status !== 'APPROVED') {
    throw new Error('承認済みのベースラインのみロックできます');
  }

  const baseline = await prisma.baseline.update({
    where: {
      id: BigInt(baselineId),
    },
    data: {
      status: 'LOCKED',
    },
  });

  return bigIntToString({
    id: baseline.id.toString(),
    testSpecId: baseline.testSpecId.toString(),
    name: baseline.name,
    description: baseline.description,
    version: baseline.version,
    status: baseline.status as BaselineStatus,
    snapshotAt: baseline.snapshotAt,
    metadata: baseline.metadata as Record<string, unknown> | null,
    totalCases: baseline.totalCases,
    totalSteps: baseline.totalSteps,
    createdAt: baseline.createdAt,
    updatedAt: baseline.updatedAt,
    createdById: baseline.createdById.toString(),
    approvedAt: baseline.approvedAt,
    approvedById: baseline.approvedById?.toString() || null,
  });
}

/**
 * ベースラインをアーカイブ
 */
export async function archiveBaseline(testSpecId: string, baselineId: string): Promise<Baseline> {
  const existing = await prisma.baseline.findFirst({
    where: {
      id: BigInt(baselineId),
      testSpecId: BigInt(testSpecId),
    },
  });

  if (!existing) {
    throw new Error('ベースラインが見つかりません');
  }

  const baseline = await prisma.baseline.update({
    where: {
      id: BigInt(baselineId),
    },
    data: {
      status: 'ARCHIVED',
    },
  });

  return bigIntToString({
    id: baseline.id.toString(),
    testSpecId: baseline.testSpecId.toString(),
    name: baseline.name,
    description: baseline.description,
    version: baseline.version,
    status: baseline.status as BaselineStatus,
    snapshotAt: baseline.snapshotAt,
    metadata: baseline.metadata as Record<string, unknown> | null,
    totalCases: baseline.totalCases,
    totalSteps: baseline.totalSteps,
    createdAt: baseline.createdAt,
    updatedAt: baseline.updatedAt,
    createdById: baseline.createdById.toString(),
    approvedAt: baseline.approvedAt,
    approvedById: baseline.approvedById?.toString() || null,
  });
}

/**
 * ベースラインを比較
 */
export async function compareBaselines(
  testSpecId: string,
  sourceBaselineId: string,
  targetBaselineId: string
): Promise<BaselineComparisonResult> {
  const [source, target] = await Promise.all([
    getBaselineById(testSpecId, sourceBaselineId),
    getBaselineById(testSpecId, targetBaselineId),
  ]);

  if (!source || !target) {
    throw new Error('比較対象のベースラインが見つかりません');
  }

  // テストケースIDをキーにしたマップを作成
  const sourceMap = new Map<string, BaselineItemInfo>();
  const targetMap = new Map<string, BaselineItemInfo>();

  for (const item of source.items) {
    if (item.testCaseId) {
      sourceMap.set(item.testCaseId, item);
    }
  }

  for (const item of target.items) {
    if (item.testCaseId) {
      targetMap.set(item.testCaseId, item);
    }
  }

  const added: BaselineItemInfo[] = [];
  const removed: BaselineItemInfo[] = [];
  const modified: { source: BaselineItemInfo; target: BaselineItemInfo; changes: string[] }[] = [];
  let unchanged = 0;

  // ターゲットにあってソースにないもの（追加）
  for (const [testCaseId, targetItem] of targetMap) {
    if (!sourceMap.has(testCaseId)) {
      added.push(targetItem);
    }
  }

  // ソースにあってターゲットにないもの（削除）
  for (const [testCaseId, sourceItem] of sourceMap) {
    if (!targetMap.has(testCaseId)) {
      removed.push(sourceItem);
    }
  }

  // 両方にあるもの（変更または未変更）
  for (const [testCaseId, sourceItem] of sourceMap) {
    const targetItem = targetMap.get(testCaseId);
    if (targetItem) {
      if (sourceItem.checksum !== targetItem.checksum) {
        // 変更を検出
        const changes: string[] = [];
        const s = sourceItem.snapshotData;
        const t = targetItem.snapshotData;

        if (s.title !== t.title) changes.push('タイトル');
        if (s.description !== t.description) changes.push('説明');
        if (s.preconditions !== t.preconditions) changes.push('前提条件');
        if (s.expectedResult !== t.expectedResult) changes.push('期待結果');
        if (s.checkpoint !== t.checkpoint) changes.push('チェックポイント');
        if (s.scenario !== t.scenario) changes.push('シナリオ');
        if (s.priority !== t.priority) changes.push('優先度');
        if (s.testType !== t.testType) changes.push('テストタイプ');
        if (JSON.stringify(s.steps) !== JSON.stringify(t.steps)) changes.push('テスト手順');

        modified.push({ source: sourceItem, target: targetItem, changes });
      } else {
        unchanged++;
      }
    }
  }

  return {
    sourceBaseline: {
      id: source.id,
      name: source.name,
      version: source.version,
    },
    targetBaseline: {
      id: target.id,
      name: target.name,
      version: target.version,
    },
    added,
    removed,
    modified,
    unchanged,
  };
}

/**
 * 最新のベースラインを取得
 */
export async function getLatestBaseline(testSpecId: string): Promise<BaselineWithStats | null> {
  const baseline = await prisma.baseline.findFirst({
    where: {
      testSpecId: BigInt(testSpecId),
      status: { not: 'ARCHIVED' },
    },
    include: {
      createdBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
      approvedBy: {
        select: {
          id: true,
          name: true,
          email: true,
        },
      },
    },
    orderBy: { snapshotAt: 'desc' },
  });

  if (!baseline) {
    return null;
  }

  return bigIntToString({
    id: baseline.id.toString(),
    testSpecId: baseline.testSpecId.toString(),
    name: baseline.name,
    description: baseline.description,
    version: baseline.version,
    status: baseline.status as BaselineStatus,
    snapshotAt: baseline.snapshotAt,
    metadata: baseline.metadata as Record<string, unknown> | null,
    totalCases: baseline.totalCases,
    totalSteps: baseline.totalSteps,
    createdAt: baseline.createdAt,
    updatedAt: baseline.updatedAt,
    createdById: baseline.createdById.toString(),
    approvedAt: baseline.approvedAt,
    approvedById: baseline.approvedById?.toString() || null,
    createdBy: baseline.createdBy
      ? {
          id: baseline.createdBy.id.toString(),
          name: baseline.createdBy.name,
          email: baseline.createdBy.email,
        }
      : null,
    approvedBy: baseline.approvedBy
      ? {
          id: baseline.approvedBy.id.toString(),
          name: baseline.approvedBy.name,
          email: baseline.approvedBy.email,
        }
      : null,
  });
}
