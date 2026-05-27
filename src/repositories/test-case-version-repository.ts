/**
 * Test Case Version Repository
 *
 * テストケースバージョン管理のリポジトリ
 */

import { prisma } from '@/lib/db';
import {
  TestCaseVersion,
  TestCaseVersionContent,
  TestCaseVersionComparison,
  createTestCaseSnapshot,
  diffTestCaseVersions,
  calculateVersionComparisonSummary,
} from '@/types/test-case-version';

// ====================================
// Version CRUD
// ====================================

/**
 * テストケースのバージョンを作成
 */
export async function createTestCaseVersion(
  testCaseId: string,
  userId?: string,
  changeNote?: string
): Promise<TestCaseVersion> {
  // テストケースを取得
  const testCase = await prisma.testCase.findUnique({
    where: { id: BigInt(testCaseId) },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!testCase) {
    throw new Error('テストケースが見つかりません');
  }

  // 現在のバージョン番号を取得
  const latestVersion = await prisma.testCaseVersion.findFirst({
    where: { testCaseId: BigInt(testCaseId) },
    orderBy: { version: 'desc' },
    select: { version: true },
  });

  const newVersionNumber = (latestVersion?.version || 0) + 1;

  // スナップショットを作成
  const snapshot = createTestCaseSnapshot(testCase);

  // バージョンを保存
  const version = await prisma.testCaseVersion.create({
    data: {
      testCaseId: BigInt(testCaseId),
      version: newVersionNumber,
      content: snapshot as unknown as object,
      changeNote: changeNote || null,
      createdBy: userId ? BigInt(userId) : null,
    },
  });

  // テストケースのcurrentVersionを更新
  await prisma.testCase.update({
    where: { id: BigInt(testCaseId) },
    data: { currentVersion: newVersionNumber },
  });

  return {
    id: version.id.toString(),
    testCaseId: version.testCaseId.toString(),
    version: version.version,
    content: version.content as unknown as TestCaseVersionContent,
    changeNote: version.changeNote || undefined,
    createdBy: version.createdBy?.toString(),
    createdAt: version.createdAt,
  };
}

/**
 * バージョンを取得
 */
export async function getTestCaseVersion(versionId: string): Promise<TestCaseVersion | null> {
  const version = await prisma.testCaseVersion.findUnique({
    where: { id: BigInt(versionId) },
  });

  if (!version) return null;

  return {
    id: version.id.toString(),
    testCaseId: version.testCaseId.toString(),
    version: version.version,
    content: version.content as unknown as TestCaseVersionContent,
    changeNote: version.changeNote || undefined,
    createdBy: version.createdBy?.toString(),
    createdAt: version.createdAt,
  };
}

/**
 * テストケースのバージョン一覧を取得
 */
export async function getTestCaseVersions(
  testCaseId: string,
  options?: { includeContent?: boolean; limit?: number; offset?: number }
): Promise<{ versions: TestCaseVersion[]; total: number }> {
  const [versions, total] = await Promise.all([
    prisma.testCaseVersion.findMany({
      where: { testCaseId: BigInt(testCaseId) },
      orderBy: { version: 'desc' },
      take: options?.limit || 50,
      skip: options?.offset || 0,
      select: {
        id: true,
        testCaseId: true,
        version: true,
        content: options?.includeContent ?? true,
        changeNote: true,
        createdBy: true,
        createdAt: true,
      },
    }),
    prisma.testCaseVersion.count({
      where: { testCaseId: BigInt(testCaseId) },
    }),
  ]);

  return {
    versions: versions.map((v) => ({
      id: v.id.toString(),
      testCaseId: v.testCaseId.toString(),
      version: v.version,
      content: v.content as unknown as TestCaseVersionContent,
      changeNote: v.changeNote || undefined,
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
export async function compareTestCaseVersions(
  sourceVersionId: string,
  targetVersionId: string
): Promise<TestCaseVersionComparison | null> {
  const [sourceVersion, targetVersion] = await Promise.all([
    getTestCaseVersion(sourceVersionId),
    getTestCaseVersion(targetVersionId),
  ]);

  if (!sourceVersion || !targetVersion) return null;

  const { fieldChanges, stepChanges } = diffTestCaseVersions(
    targetVersion.content,
    sourceVersion.content
  );

  const summary = calculateVersionComparisonSummary(fieldChanges, stepChanges);

  return {
    sourceVersionId,
    sourceVersion: sourceVersion.version,
    targetVersionId,
    targetVersion: targetVersion.version,
    fieldChanges,
    stepChanges,
    summary,
  };
}

/**
 * 現在の状態とバージョンを比較
 */
export async function compareWithCurrentTestCase(
  testCaseId: string,
  versionId: string
): Promise<TestCaseVersionComparison | null> {
  // 現在のテストケースを取得
  const testCase = await prisma.testCase.findUnique({
    where: { id: BigInt(testCaseId) },
    include: {
      steps: {
        orderBy: { stepNumber: 'asc' },
      },
      tags: {
        include: {
          tag: true,
        },
      },
    },
  });

  if (!testCase) return null;

  // 比較対象のバージョンを取得
  const targetVersion = await getTestCaseVersion(versionId);
  if (!targetVersion) return null;

  // 現在のスナップショットを作成
  const currentSnapshot = createTestCaseSnapshot(testCase);

  const { fieldChanges, stepChanges } = diffTestCaseVersions(
    targetVersion.content,
    currentSnapshot
  );

  const summary = calculateVersionComparisonSummary(fieldChanges, stepChanges);

  return {
    sourceVersionId: 'current',
    sourceVersion: testCase.currentVersion,
    targetVersionId,
    targetVersion: targetVersion.version,
    fieldChanges,
    stepChanges,
    summary,
  };
}

// ====================================
// Version Restore
// ====================================

/**
 * バージョンを復元
 */
export async function restoreTestCaseVersion(
  versionId: string,
  userId?: string,
  options?: {
    createNewVersion?: boolean;
    changeNote?: string;
  }
): Promise<{
  success: boolean;
  restoredSteps: number;
  newVersion?: TestCaseVersion;
}> {
  const version = await getTestCaseVersion(versionId);
  if (!version || !version.content) {
    throw new Error('バージョンが見つからないか、コンテンツがありません');
  }

  const testCaseId = BigInt(version.testCaseId);
  const content = version.content;

  // トランザクションで復元を実行
  await prisma.$transaction(async (tx) => {
    // 1. 既存のステップを削除
    await tx.testStep.deleteMany({
      where: { testCaseId },
    });

    // 2. 既存のタグ関連を削除
    await tx.testCaseTag.deleteMany({
      where: { testCaseId },
    });

    // 3. テストケースを更新
    await tx.testCase.update({
      where: { id: testCaseId },
      data: {
        title: content.title,
        description: content.description || null,
        preconditions: content.preconditions || null,
        expectedResult: content.expectedResult || null,
        checkpoint: content.checkpoint || null,
        scenario: content.scenario || null,
        testEnvironment: content.testEnvironment || null,
        notes: content.notes || null,
        priority: content.priority || 'MEDIUM',
        testType: content.testType || 'MANUAL',
        testTechnique: content.testTechnique || null,
        estimatedTime: content.estimatedTime || null,
      },
    });

    // 4. ステップを復元
    for (const step of content.steps) {
      await tx.testStep.create({
        data: {
          testCaseId,
          stepNumber: step.stepNumber,
          action: step.action,
          expectedResult: step.expectedResult,
        },
      });
    }

    // 5. タグを復元
    if (content.tags && content.tags.length > 0) {
      const testCase = await tx.testCase.findUnique({
        where: { id: testCaseId },
        include: {
          testSpec: {
            select: { projectId: true },
          },
        },
      });

      if (testCase?.testSpec) {
        for (const tagName of content.tags) {
          let tag = await tx.tag.findFirst({
            where: {
              projectId: testCase.testSpec.projectId,
              name: tagName,
            },
          });

          if (!tag) {
            tag = await tx.tag.create({
              data: {
                projectId: testCase.testSpec.projectId,
                name: tagName,
              },
            });
          }

          await tx.testCaseTag.create({
            data: {
              testCaseId,
              tagId: tag.id,
            },
          });
        }
      }
    }
  });

  // 新しいバージョンを作成（オプション）
  let newVersion: TestCaseVersion | undefined;
  if (options?.createNewVersion) {
    newVersion = await createTestCaseVersion(
      version.testCaseId,
      userId,
      options.changeNote || `バージョン ${version.version} から復元`
    );
  }

  return {
    success: true,
    restoredSteps: content.steps.length,
    newVersion,
  };
}

/**
 * 特定のバージョン番号を取得
 */
export async function getTestCaseVersionByNumber(
  testCaseId: string,
  versionNumber: number
): Promise<TestCaseVersion | null> {
  const version = await prisma.testCaseVersion.findFirst({
    where: {
      testCaseId: BigInt(testCaseId),
      version: versionNumber,
    },
  });

  if (!version) return null;

  return {
    id: version.id.toString(),
    testCaseId: version.testCaseId.toString(),
    version: version.version,
    content: version.content as unknown as TestCaseVersionContent,
    changeNote: version.changeNote || undefined,
    createdBy: version.createdBy?.toString(),
    createdAt: version.createdAt,
  };
}

/**
 * バージョンを削除（最新バージョン以外）
 */
export async function deleteTestCaseVersion(versionId: string): Promise<boolean> {
  const version = await prisma.testCaseVersion.findUnique({
    where: { id: BigInt(versionId) },
  });

  if (!version) return false;

  // 最新バージョンかどうかをチェック
  const latestVersion = await prisma.testCaseVersion.findFirst({
    where: { testCaseId: version.testCaseId },
    orderBy: { version: 'desc' },
  });

  if (latestVersion && latestVersion.id === version.id) {
    throw new Error('最新バージョンは削除できません');
  }

  await prisma.testCaseVersion.delete({
    where: { id: BigInt(versionId) },
  });

  return true;
}
