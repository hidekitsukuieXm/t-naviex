/**
 * Version Management Repository
 *
 * テスト仕様書バージョン管理のリポジトリ
 */

import { prisma } from '@/lib/prisma';
import {
  TestSpecVersion,
  VersionContent,
  SectionSnapshot,
  TestCaseSnapshot,
  VersionComparison,
  SectionChange,
  TestCaseChange,
  ChangeType,
  diffTestCases,
  diffSections,
  calculateComparisonSummary,
} from '@/types/version-management';

// ====================================
// Snapshot Creation
// ====================================

/**
 * テスト仕様書のスナップショットを作成
 */
export async function createVersionSnapshot(testSpecId: string): Promise<VersionContent> {
  // セクションを取得
  const sections = await prisma.testSection.findMany({
    where: { testSpecId: BigInt(testSpecId) },
    orderBy: [{ parentId: 'asc' }, { sortOrder: 'asc' }],
    select: {
      id: true,
      name: true,
      parentId: true,
      sortOrder: true,
    },
  });

  // テストケースを取得（ステップも含む）
  const testCases = await prisma.testCase.findMany({
    where: {
      testSpecId: BigInt(testSpecId),
      deletedAt: null,
    },
    select: {
      id: true,
      sectionId: true,
      title: true,
      description: true,
      preconditions: true,
      priority: true,
      testType: true,
      estimatedTime: true,
      testSteps: {
        select: {
          id: true,
          stepNo: true,
          actionMd: true,
          expectedMd: true,
        },
        orderBy: { stepNo: 'asc' },
      },
      testCaseTags: {
        select: {
          tag: {
            select: { name: true },
          },
        },
      },
    },
  });

  const sectionSnapshots: SectionSnapshot[] = sections.map((s) => ({
    id: s.id.toString(),
    name: s.name,
    parentId: s.parentId?.toString(),
    sortOrder: s.sortOrder,
  }));

  const testCaseSnapshots: TestCaseSnapshot[] = testCases.map((tc) => ({
    id: tc.id.toString(),
    sectionId: tc.sectionId?.toString() || '',
    title: tc.title,
    description: tc.description || undefined,
    preconditions: tc.preconditions || undefined,
    steps: tc.testSteps.map(
      (step: { id: bigint; stepNo: number; actionMd: string; expectedMd: string | null }) => ({
        id: step.id.toString(),
        stepNumber: step.stepNo,
        action: step.actionMd,
        expectedResult: step.expectedMd || '',
      })
    ),
    priority: tc.priority || undefined,
    status: undefined,
    testType: tc.testType || undefined,
    estimatedTime: tc.estimatedTime || undefined,
    tags: tc.testCaseTags.map((t: { tag: { name: string } }) => t.tag.name),
  }));

  return {
    sections: sectionSnapshots,
    testCases: testCaseSnapshots,
    metadata: {
      capturedAt: new Date(),
    },
  };
}

// ====================================
// Version CRUD
// ====================================

/**
 * バージョンを作成（スナップショット付き）
 */
export async function createVersionWithSnapshot(
  testSpecId: string,
  userId: string,
  data: {
    version: string;
    changeNote?: string;
  }
): Promise<TestSpecVersion> {
  // スナップショットを作成
  const snapshot = await createVersionSnapshot(testSpecId);

  // バージョンを保存
  const version = await prisma.testSpecVersion.create({
    data: {
      testSpecId: BigInt(testSpecId),
      version: data.version,
      changeNote: data.changeNote || null,
      content: snapshot as unknown as object,
      sectionCount: snapshot.sections.length,
      testCaseCount: snapshot.testCases.length,
      createdBy: BigInt(userId),
    },
  });

  // テスト仕様書のバージョンも更新
  await prisma.testSpec.update({
    where: { id: BigInt(testSpecId) },
    data: { version: data.version },
  });

  return {
    id: version.id.toString(),
    testSpecId: version.testSpecId.toString(),
    version: version.version,
    changeNote: version.changeNote || undefined,
    content: version.content as unknown as VersionContent | undefined,
    sectionCount: version.sectionCount || undefined,
    testCaseCount: version.testCaseCount || undefined,
    createdBy: version.createdBy?.toString(),
    createdAt: version.createdAt,
  };
}

/**
 * バージョンを取得
 */
export async function getVersion(versionId: string): Promise<TestSpecVersion | null> {
  const version = await prisma.testSpecVersion.findUnique({
    where: { id: BigInt(versionId) },
  });

  if (!version) return null;

  return {
    id: version.id.toString(),
    testSpecId: version.testSpecId.toString(),
    version: version.version,
    changeNote: version.changeNote || undefined,
    content: version.content as unknown as VersionContent | undefined,
    sectionCount: version.sectionCount || undefined,
    testCaseCount: version.testCaseCount || undefined,
    createdBy: version.createdBy?.toString(),
    createdAt: version.createdAt,
  };
}

/**
 * バージョン一覧を取得
 */
export async function getVersions(
  testSpecId: string,
  options?: { includeContent?: boolean; limit?: number; offset?: number }
): Promise<{ versions: TestSpecVersion[]; total: number }> {
  const [versions, total] = await Promise.all([
    prisma.testSpecVersion.findMany({
      where: { testSpecId: BigInt(testSpecId) },
      orderBy: { createdAt: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      select: {
        id: true,
        testSpecId: true,
        version: true,
        changeNote: true,
        content: options?.includeContent || false,
        sectionCount: true,
        testCaseCount: true,
        createdBy: true,
        createdAt: true,
      },
    }),
    prisma.testSpecVersion.count({
      where: { testSpecId: BigInt(testSpecId) },
    }),
  ]);

  return {
    versions: versions.map((v) => ({
      id: v.id.toString(),
      testSpecId: v.testSpecId.toString(),
      version: v.version,
      changeNote: v.changeNote || undefined,
      content: v.content as unknown as VersionContent | undefined,
      sectionCount: v.sectionCount || undefined,
      testCaseCount: v.testCaseCount || undefined,
      createdBy: v.createdBy?.toString(),
      createdAt: v.createdAt,
    })),
    total,
  };
}

// ====================================
// Version Comparison
// ====================================

/**
 * 2つのバージョンを比較
 */
export async function compareVersions(
  sourceVersionId: string,
  targetVersionId: string
): Promise<VersionComparison | null> {
  const [sourceVersion, targetVersion] = await Promise.all([
    getVersion(sourceVersionId),
    getVersion(targetVersionId),
  ]);

  if (!sourceVersion || !targetVersion) return null;

  const sourceContent = sourceVersion.content || { sections: [], testCases: [] };
  const targetContent = targetVersion.content || { sections: [], testCases: [] };

  // セクション変更を検出
  const sectionChanges = compareSections(sourceContent.sections, targetContent.sections);

  // テストケース変更を検出
  const testCaseChanges = compareTestCases(sourceContent.testCases, targetContent.testCases);

  // サマリーを計算
  const summary = calculateComparisonSummary(sectionChanges, testCaseChanges);

  return {
    sourceVersionId,
    sourceVersion: sourceVersion.version,
    targetVersionId,
    targetVersion: targetVersion.version,
    sectionChanges,
    testCaseChanges,
    summary,
  };
}

/**
 * セクションを比較
 */
function compareSections(
  sourceSections: SectionSnapshot[],
  targetSections: SectionSnapshot[]
): SectionChange[] {
  const changes: SectionChange[] = [];
  const sourceMap = new Map(sourceSections.map((s) => [s.id, s]));
  const targetMap = new Map(targetSections.map((s) => [s.id, s]));

  // ソースにあってターゲットにない → 追加
  sourceSections.forEach((source) => {
    if (!targetMap.has(source.id)) {
      changes.push({
        sectionId: source.id,
        sectionName: source.name,
        changeType: ChangeType.ADDED,
        currentValue: source,
      });
    }
  });

  // ターゲットにあってソースにない → 削除
  targetSections.forEach((target) => {
    if (!sourceMap.has(target.id)) {
      changes.push({
        sectionId: target.id,
        sectionName: target.name,
        changeType: ChangeType.REMOVED,
        previousValue: target,
      });
    }
  });

  // 両方にある → 変更チェック
  sourceSections.forEach((source) => {
    const target = targetMap.get(source.id);
    if (target) {
      const sectionDiffs = diffSections(target, source);
      if (sectionDiffs.length > 0) {
        changes.push({
          sectionId: source.id,
          sectionName: source.name,
          changeType: ChangeType.MODIFIED,
          previousValue: target,
          currentValue: source,
          changes: sectionDiffs,
        });
      } else {
        changes.push({
          sectionId: source.id,
          sectionName: source.name,
          changeType: ChangeType.UNCHANGED,
          previousValue: target,
          currentValue: source,
        });
      }
    }
  });

  return changes;
}

/**
 * テストケースを比較
 */
function compareTestCases(
  sourceTestCases: TestCaseSnapshot[],
  targetTestCases: TestCaseSnapshot[]
): TestCaseChange[] {
  const changes: TestCaseChange[] = [];
  const sourceMap = new Map(sourceTestCases.map((tc) => [tc.id, tc]));
  const targetMap = new Map(targetTestCases.map((tc) => [tc.id, tc]));

  // ソースにあってターゲットにない → 追加
  sourceTestCases.forEach((source) => {
    if (!targetMap.has(source.id)) {
      changes.push({
        testCaseId: source.id,
        testCaseTitle: source.title,
        sectionId: source.sectionId,
        changeType: ChangeType.ADDED,
        currentValue: source,
      });
    }
  });

  // ターゲットにあってソースにない → 削除
  targetTestCases.forEach((target) => {
    if (!sourceMap.has(target.id)) {
      changes.push({
        testCaseId: target.id,
        testCaseTitle: target.title,
        sectionId: target.sectionId,
        changeType: ChangeType.REMOVED,
        previousValue: target,
      });
    }
  });

  // 両方にある → 変更チェック
  sourceTestCases.forEach((source) => {
    const target = targetMap.get(source.id);
    if (target) {
      const fieldChanges = diffTestCases(target, source);
      if (fieldChanges.length > 0) {
        changes.push({
          testCaseId: source.id,
          testCaseTitle: source.title,
          sectionId: source.sectionId,
          changeType: ChangeType.MODIFIED,
          previousValue: target,
          currentValue: source,
          fieldChanges,
        });
      } else {
        changes.push({
          testCaseId: source.id,
          testCaseTitle: source.title,
          sectionId: source.sectionId,
          changeType: ChangeType.UNCHANGED,
          previousValue: target,
          currentValue: source,
        });
      }
    }
  });

  return changes;
}

// ====================================
// Version Restore
// ====================================

/**
 * バージョンを復元
 */
export async function restoreVersion(
  versionId: string,
  userId: string,
  options?: {
    createNewVersion?: boolean;
    newVersionNumber?: string;
    changeNote?: string;
  }
): Promise<{
  success: boolean;
  restoredSections: number;
  restoredTestCases: number;
  newVersion?: TestSpecVersion;
}> {
  const version = await getVersion(versionId);
  if (!version || !version.content) {
    throw new Error('バージョンが見つからないか、コンテンツがありません');
  }

  const testSpecId = BigInt(version.testSpecId);
  const content = version.content;

  // トランザクションで復元を実行
  await prisma.$transaction(async (tx) => {
    // 1. 既存のセクションを削除（テストケースはCascadeで削除される）
    await tx.testSection.deleteMany({
      where: { testSpecId },
    });

    // 2. セクションを復元（親子関係を考慮してルートから順に作成）
    const sectionIdMap = new Map<string, bigint>();

    // 親がないセクションを先に作成
    const rootSections = content.sections.filter((s) => !s.parentId);
    for (const section of rootSections) {
      const created = await tx.testSection.create({
        data: {
          testSpecId,
          name: section.name,
          sortOrder: section.sortOrder,
        },
      });
      sectionIdMap.set(section.id, created.id);
    }

    // 子セクションを作成（再帰的に）
    const createChildSections = async (parentOldId: string, parentNewId: bigint) => {
      const children = content.sections.filter((s) => s.parentId === parentOldId);
      for (const child of children) {
        const created = await tx.testSection.create({
          data: {
            testSpecId,
            parentId: parentNewId,
            name: child.name,
            sortOrder: child.sortOrder,
          },
        });
        sectionIdMap.set(child.id, created.id);
        await createChildSections(child.id, created.id);
      }
    };

    for (const [oldId, newId] of sectionIdMap.entries()) {
      const oldSection = content.sections.find((s) => s.id === oldId);
      if (oldSection && !oldSection.parentId) {
        await createChildSections(oldId, newId);
      }
    }

    // 3. テストケースを復元
    for (const tc of content.testCases) {
      const newSectionId = sectionIdMap.get(tc.sectionId);

      const createdTestCase = await tx.testCase.create({
        data: {
          testSpecId,
          sectionId: newSectionId || null,
          title: tc.title,
          description: tc.description || null,
          preconditions: tc.preconditions || null,
          priority: (tc.priority || 'MEDIUM') as 'HIGH' | 'MEDIUM' | 'LOW',
          testType: (tc.testType || 'FUNCTIONAL') as import('@/generated/prisma').TestType,
          estimatedTime: tc.estimatedTime || null,
        },
      });

      // ステップを作成
      for (const step of tc.steps) {
        await tx.testStep.create({
          data: {
            testCase: { connect: { id: createdTestCase.id } },
            stepNo: step.stepNumber,
            actionMd: step.action,
            expectedMd: step.expectedResult,
          },
        });
      }

      // タグを復元（タグが存在する場合のみ）
      if (tc.tags && tc.tags.length > 0) {
        for (const tagName of tc.tags) {
          // タグを取得または作成
          const testSpec = await tx.testSpec.findUnique({
            where: { id: testSpecId },
            select: { projectId: true },
          });

          if (testSpec) {
            let tag = await tx.tag.findFirst({
              where: {
                projectId: testSpec.projectId,
                name: tagName,
              },
            });

            if (!tag) {
              tag = await tx.tag.create({
                data: {
                  projectId: testSpec.projectId,
                  name: tagName,
                },
              });
            }

            await tx.testCaseTag.create({
              data: {
                testCaseId: createdTestCase.id,
                tagId: tag.id,
              },
            });
          }
        }
      }
    }
  });

  // 新しいバージョンを作成（オプション）
  let newVersion: TestSpecVersion | undefined;
  if (options?.createNewVersion && options?.newVersionNumber) {
    newVersion = await createVersionWithSnapshot(version.testSpecId, userId, {
      version: options.newVersionNumber,
      changeNote: options.changeNote || `バージョン ${version.version} から復元`,
    });
  }

  return {
    success: true,
    restoredSections: content.sections.length,
    restoredTestCases: content.testCases.length,
    newVersion,
  };
}

/**
 * 現在のバージョンと過去のバージョンを比較
 */
export async function compareWithCurrent(
  testSpecId: string,
  versionId: string
): Promise<VersionComparison | null> {
  // 現在のスナップショットを取得
  const currentContent = await createVersionSnapshot(testSpecId);

  // 比較対象のバージョンを取得
  const targetVersion = await getVersion(versionId);
  if (!targetVersion || !targetVersion.content) return null;

  // セクション変更を検出
  const sectionChanges = compareSections(currentContent.sections, targetVersion.content.sections);

  // テストケース変更を検出
  const testCaseChanges = compareTestCases(
    currentContent.testCases,
    targetVersion.content.testCases
  );

  // サマリーを計算
  const summary = calculateComparisonSummary(sectionChanges, testCaseChanges);

  return {
    sourceVersionId: 'current',
    sourceVersion: '(現在)',
    targetVersionId: versionId,
    targetVersion: targetVersion.version,
    sectionChanges,
    testCaseChanges,
    summary,
  };
}
