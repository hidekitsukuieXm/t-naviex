/**
 * qTest Importer Service
 * qTestからのテストケース移行を担当するサービス（API経由）
 */

import { prisma } from '@/lib/prisma';
import type { MigrationResult, MigrationSummary, MigrationWarning } from '@/types/migration';

// ============================================
// qTest 型定義
// ============================================

export interface QTestConfig {
  baseUrl: string;
  accessToken: string;
  projectId: number;
}

export interface QTestModule {
  id: number;
  name: string;
  description?: string;
  parentId?: number;
  order?: number;
  children?: QTestModule[];
}

export interface QTestTestCase {
  id: number;
  name: string;
  description?: string;
  precondition?: string;
  priority?: {
    id: number;
    name: string;
  };
  status?: {
    id: number;
    name: string;
  };
  properties?: Array<{
    field_id: number;
    field_name: string;
    field_value: string;
  }>;
  test_steps?: QTestTestStep[];
  parent_id?: number;
}

export interface QTestTestStep {
  id: number;
  order: number;
  description: string;
  expected: string;
}

export interface QTestImportOptions {
  projectId: string;
  testSpecId?: string;
  createTestSpec?: boolean;
  testSpecName?: string;
  preserveModules?: boolean;
  moduleId?: number;
  defaultPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  defaultTestType?: string;
  defaultTestTechnique?: string;
}

// ============================================
// qTest API クライアント
// ============================================

/**
 * qTest API クライアント
 */
export class QTestClient {
  private baseUrl: string;
  private accessToken: string;
  private projectId: number;

  constructor(config: QTestConfig) {
    this.baseUrl = config.baseUrl.replace(/\/$/, '');
    this.accessToken = config.accessToken;
    this.projectId = config.projectId;
  }

  /**
   * APIリクエストを実行
   */
  private async request<T>(
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const response = await fetch(`${this.baseUrl}/api/v3${endpoint}`, {
        method,
        headers: {
          Authorization: `Bearer ${this.accessToken}`,
          'Content-Type': 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `qTest API error: ${response.status} - ${errorText}`,
        };
      }

      const data = await response.json();
      return { success: true, data };
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'API request failed',
      };
    }
  }

  /**
   * モジュール一覧を取得
   */
  async getModules(): Promise<{ success: boolean; modules?: QTestModule[]; error?: string }> {
    const result = await this.request<QTestModule[]>(`/projects/${this.projectId}/modules`);

    if (result.success && result.data) {
      return { success: true, modules: result.data };
    }

    return { success: false, error: result.error };
  }

  /**
   * モジュール配下のテストケース一覧を取得
   */
  async getTestCases(
    moduleId: number,
    page: number = 1,
    pageSize: number = 100
  ): Promise<{ success: boolean; testCases?: QTestTestCase[]; total?: number; error?: string }> {
    const result = await this.request<{ items: QTestTestCase[]; total: number }>(
      `/projects/${this.projectId}/test-cases?parentId=${moduleId}&page=${page}&pageSize=${pageSize}&expandProps=true&expandSteps=true`
    );

    if (result.success && result.data) {
      return {
        success: true,
        testCases: result.data.items || (result.data as unknown as QTestTestCase[]),
        total: result.data.total,
      };
    }

    return { success: false, error: result.error };
  }

  /**
   * 単一のテストケースを取得
   */
  async getTestCase(
    testCaseId: number
  ): Promise<{ success: boolean; testCase?: QTestTestCase; error?: string }> {
    const result = await this.request<QTestTestCase>(
      `/projects/${this.projectId}/test-cases/${testCaseId}?expandProps=true&expandSteps=true`
    );

    if (result.success && result.data) {
      return { success: true, testCase: result.data };
    }

    return { success: false, error: result.error };
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const result = await this.request(`/projects/${this.projectId}`);
    return { success: result.success, error: result.error };
  }
}

// ============================================
// インポート処理
// ============================================

/**
 * qTestからテストケースをインポート
 */
export async function importFromQTest(
  config: QTestConfig,
  options: QTestImportOptions,
  userId: bigint
): Promise<MigrationResult> {
  const startedAt = new Date().toISOString();
  const migrationId = `migration_qtest_${Date.now()}`;

  const summary: MigrationSummary = {
    totalTestSuites: 0,
    totalTestCases: 0,
    totalTestSteps: 0,
    importedTestSuites: 0,
    importedTestCases: 0,
    importedTestSteps: 0,
    skippedItems: 0,
    errors: [],
    warnings: [],
  };

  try {
    const client = new QTestClient(config);

    // 接続テスト
    const connectionTest = await client.testConnection();
    if (!connectionTest.success) {
      return {
        success: false,
        migrationId,
        source: 'QTEST',
        status: 'FAILED',
        summary: {
          ...summary,
          errors: [
            {
              itemType: 'SUITE',
              itemId: 'connection',
              itemName: 'Connection',
              errorMessage: connectionTest.error || '接続に失敗しました。',
            },
          ],
        },
        startedAt,
        completedAt: new Date().toISOString(),
        projectId: options.projectId,
      };
    }

    // テスト仕様書の取得または作成
    let testSpecId: bigint;
    let createdTestSpecId: string | undefined;

    if (options.createTestSpec) {
      const testSpec = await prisma.testSpec.create({
        data: {
          projectId: BigInt(options.projectId),
          name: options.testSpecName || 'qTest Import',
          description: 'qTestからインポートされたテストケース',
          status: 'DRAFT',
          version: '1',
        },
      });
      testSpecId = testSpec.id;
      createdTestSpecId = testSpec.id.toString();
    } else {
      testSpecId = BigInt(options.testSpecId!);
    }

    // モジュール構造の取得
    const modulesResult = await client.getModules();
    if (!modulesResult.success || !modulesResult.modules) {
      summary.warnings.push({
        itemType: 'SUITE',
        itemId: 'modules',
        itemName: 'Modules',
        warningMessage: 'モジュール一覧の取得に失敗しました。単一セクションでインポートします。',
      });
    }

    const modules = modulesResult.modules || [];
    const targetModules = options.moduleId
      ? modules.filter((m) => m.id === options.moduleId || m.parentId === options.moduleId)
      : modules;

    summary.totalTestSuites = targetModules.length || 1;

    // モジュール→セクションのマッピング
    const moduleSectionMap = new Map<number, bigint>();

    if (options.preserveModules && targetModules.length > 0) {
      await importModulesAsSection(targetModules, testSpecId, null, moduleSectionMap, summary);
    } else {
      // デフォルトセクション
      const section = await prisma.testSection.create({
        data: {
          testSpecId,
          name: 'Imported from qTest',
          sortOrder: 0,
        },
      });
      moduleSectionMap.set(0, section.id);
      summary.importedTestSuites++;
    }

    // テストケースのインポート
    for (const qTestModule of targetModules.length > 0 ? targetModules : [{ id: 0 }]) {
      let page = 1;
      let hasMore = true;

      while (hasMore) {
        const testCasesResult = await client.getTestCases(qTestModule.id, page, 100);
        if (!testCasesResult.success || !testCasesResult.testCases) {
          summary.warnings.push({
            itemType: 'CASE',
            itemId: `module_${qTestModule.id}`,
            itemName: `Module ${qTestModule.id}`,
            warningMessage: testCasesResult.error || 'テストケースの取得に失敗しました。',
          });
          break;
        }

        const testCases = testCasesResult.testCases;
        summary.totalTestCases += testCases.length;
        summary.totalTestSteps += testCases.reduce(
          (sum, tc) => sum + (tc.test_steps?.length || 0),
          0
        );

        for (const tc of testCases) {
          await importQTestTestCase(tc, testSpecId, moduleSectionMap, options, summary);
        }

        hasMore = testCases.length === 100;
        page++;
      }
    }

    return {
      success: summary.errors.length === 0,
      migrationId,
      source: 'QTEST',
      status: 'COMPLETED',
      summary,
      startedAt,
      completedAt: new Date().toISOString(),
      projectId: options.projectId,
      testSpecId: options.testSpecId,
      createdTestSpecId,
    };
  } catch (error) {
    return {
      success: false,
      migrationId,
      source: 'QTEST',
      status: 'FAILED',
      summary: {
        ...summary,
        errors: [
          {
            itemType: 'CASE',
            itemId: 'import',
            itemName: 'Import',
            errorMessage: error instanceof Error ? error.message : 'インポートエラー',
          },
        ],
      },
      startedAt,
      completedAt: new Date().toISOString(),
      projectId: options.projectId,
    };
  }
}

/**
 * モジュールをセクションとしてインポート
 */
async function importModulesAsSection(
  modules: QTestModule[],
  testSpecId: bigint,
  parentSectionId: bigint | null,
  sectionMap: Map<number, bigint>,
  summary: MigrationSummary
): Promise<void> {
  let sortOrder = 0;

  for (const qTestModule of modules) {
    try {
      const section = await prisma.testSection.create({
        data: {
          testSpecId,
          parentId: parentSectionId,
          name: qTestModule.name,
          sortOrder: sortOrder++,
        },
      });

      sectionMap.set(qTestModule.id, section.id);
      summary.importedTestSuites++;

      // 子モジュールの再帰処理
      if (qTestModule.children && qTestModule.children.length > 0) {
        await importModulesAsSection(
          qTestModule.children,
          testSpecId,
          section.id,
          sectionMap,
          summary
        );
      }
    } catch (error) {
      summary.errors.push({
        itemType: 'SUITE',
        itemId: String(qTestModule.id),
        itemName: qTestModule.name,
        errorMessage: error instanceof Error ? error.message : 'セクション作成エラー',
      });
    }
  }
}

/**
 * qTestテストケースをインポート
 */
async function importQTestTestCase(
  tc: QTestTestCase,
  testSpecId: bigint,
  moduleSectionMap: Map<number, bigint>,
  options: QTestImportOptions,
  summary: MigrationSummary
): Promise<void> {
  try {
    // セクションの決定
    const sectionId =
      tc.parent_id && moduleSectionMap.has(tc.parent_id)
        ? moduleSectionMap.get(tc.parent_id)!
        : moduleSectionMap.get(0) || moduleSectionMap.values().next().value!;

    // 優先度のマッピング
    const priority = mapQTestPriority(tc.priority?.name, options.defaultPriority);

    // テストケースを作成
    const testCase = await prisma.testCase.create({
      data: {
        testSpecId,
        sectionId,
        title: tc.name,
        description: tc.description || null,
        preconditions: tc.precondition || null,
        priority,
        testType: (options.defaultTestType as 'FUNCTIONAL') || 'FUNCTIONAL',
        testTechnique: (options.defaultTestTechnique as 'OTHER') || 'OTHER',
        tags: [],
        referenceId: `qTest-${tc.id}`,
        sortOrder: summary.importedTestCases,
        isMatrix: false,
      },
    });

    summary.importedTestCases++;

    // ステップのインポート
    if (tc.test_steps) {
      for (const step of tc.test_steps) {
        await prisma.testStep.create({
          data: {
            testCaseId: testCase.id,
            stepNo: step.order,
            actionMd: step.description,
            expectedMd: step.expected || null,
          },
        });
        summary.importedTestSteps++;
      }
    }
  } catch (error) {
    summary.errors.push({
      itemType: 'CASE',
      itemId: String(tc.id),
      itemName: tc.name,
      errorMessage: error instanceof Error ? error.message : 'テストケース作成エラー',
    });
  }
}

/**
 * qTest優先度をマッピング
 */
function mapQTestPriority(
  priorityName?: string,
  defaultPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!priorityName) return defaultPriority || 'MEDIUM';

  const lower = priorityName.toLowerCase();
  if (lower.includes('critical') || lower.includes('blocker')) return 'CRITICAL';
  if (lower.includes('high') || lower.includes('major')) return 'HIGH';
  if (lower.includes('low') || lower.includes('minor') || lower.includes('trivial')) return 'LOW';
  return 'MEDIUM';
}

// ============================================
// バリデーション
// ============================================

/**
 * qTest設定のバリデーション
 */
export function validateQTestConfig(config: QTestConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.baseUrl || config.baseUrl.trim() === '') {
    errors.push('qTestのURLは必須です。');
  } else {
    try {
      new URL(config.baseUrl);
    } catch {
      errors.push('qTestのURLが無効です。');
    }
  }

  if (!config.accessToken || config.accessToken.trim() === '') {
    errors.push('アクセストークンは必須です。');
  }

  if (!config.projectId || config.projectId <= 0) {
    errors.push('有効なプロジェクトIDが必要です。');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
