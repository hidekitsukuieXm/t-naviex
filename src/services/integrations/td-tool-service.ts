/**
 * TD Test Design Tool Integration Service
 * TDテスト設計ツールとの連携を担当するサービス
 */

import { prisma } from '@/lib/prisma';
import type {
  MigrationResult,
  MigrationSummary,
  MigrationWarning,
  ImportPreview,
} from '@/types/migration';

// ============================================
// TD Tool 型定義
// ============================================

export interface TdToolConfig {
  baseUrl?: string;
  apiKey?: string;
  format: 'json' | 'xml' | 'csv';
}

export interface TdToolTestCase {
  id: string;
  testId?: string;
  name: string;
  objective?: string;
  preconditions?: string;
  procedure?: string;
  expectedResult?: string;
  testType?: string;
  testTechnique?: string;
  priority?: string;
  category?: string;
  steps?: TdToolTestStep[];
  relatedRequirements?: string[];
  tags?: string[];
  author?: string;
  createdDate?: string;
  lastModifiedDate?: string;
}

export interface TdToolTestStep {
  stepNo: number;
  action: string;
  expectedResult: string;
  testData?: string;
  remarks?: string;
}

export interface TdToolTestSuite {
  id: string;
  name: string;
  description?: string;
  testCases?: TdToolTestCase[];
  children?: TdToolTestSuite[];
}

export interface TdToolImportOptions {
  projectId: string;
  testSpecId?: string;
  createTestSpec?: boolean;
  testSpecName?: string;
  preserveStructure?: boolean;
  importRelatedRequirements?: boolean;
  defaultPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  defaultTestType?: string;
  defaultTestTechnique?: string;
}

export interface TdToolExportOptions {
  testSpecId: string;
  format: 'json' | 'xml' | 'csv';
  includeSteps?: boolean;
  includeSections?: boolean;
  includeMetadata?: boolean;
}

// ============================================
// JSON パーサー
// ============================================

/**
 * TDツールJSONをパース
 */
export function parseTdToolJson(jsonContent: string): {
  success: boolean;
  data?: {
    testSuites?: TdToolTestSuite[];
    testCases?: TdToolTestCase[];
  };
  error?: string;
} {
  try {
    const data = JSON.parse(jsonContent);

    // テストスイート形式
    if (data.testSuites && Array.isArray(data.testSuites)) {
      return {
        success: true,
        data: {
          testSuites: data.testSuites.map(mapTdToolTestSuite),
        },
      };
    }

    // テストケース配列形式
    if (data.testCases && Array.isArray(data.testCases)) {
      return {
        success: true,
        data: {
          testCases: data.testCases.map(mapTdToolTestCase),
        },
      };
    }

    // 直接配列形式
    if (Array.isArray(data)) {
      return {
        success: true,
        data: {
          testCases: data.map(mapTdToolTestCase),
        },
      };
    }

    // 単一オブジェクト形式
    if (data.id || data.testId || data.name) {
      return {
        success: true,
        data: {
          testCases: [mapTdToolTestCase(data)],
        },
      };
    }

    return {
      success: false,
      error: 'サポートされていないデータ形式です。',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'JSONパースエラー',
    };
  }
}

/**
 * TDツールテストスイートをマッピング
 */
function mapTdToolTestSuite(item: Record<string, unknown>): TdToolTestSuite {
  return {
    id: String(item.id || `suite_${Date.now()}`),
    name: String(item.name || item.title || 'Unnamed Suite'),
    description: item.description ? String(item.description) : undefined,
    testCases: Array.isArray(item.testCases) ? item.testCases.map(mapTdToolTestCase) : undefined,
    children: Array.isArray(item.children || item.suites || item.subSuites)
      ? ((item.children || item.suites || item.subSuites) as Array<Record<string, unknown>>).map(
          mapTdToolTestSuite
        )
      : undefined,
  };
}

/**
 * TDツールテストケースをマッピング
 */
function mapTdToolTestCase(item: Record<string, unknown>): TdToolTestCase {
  const id = String(item.id || item.testId || `tc_${Date.now()}_${Math.random()}`);

  // ステップの変換
  const steps: TdToolTestStep[] = [];
  if (Array.isArray(item.steps || item.testSteps || item.procedures)) {
    const rawSteps = (item.steps || item.testSteps || item.procedures) as Array<
      Record<string, unknown>
    >;
    rawSteps.forEach((step, index) => {
      steps.push({
        stepNo: Number(step.stepNo || step.no || step.order || index + 1),
        action: String(step.action || step.procedure || step.operation || step.description || ''),
        expectedResult: String(step.expectedResult || step.expected || step.result || ''),
        testData: step.testData ? String(step.testData) : undefined,
        remarks: step.remarks ? String(step.remarks) : undefined,
      });
    });
  }

  // タグの変換
  const tags: string[] = [];
  if (Array.isArray(item.tags)) {
    tags.push(...item.tags.map(String));
  } else if (typeof item.tags === 'string') {
    tags.push(
      ...item.tags
        .split(/[,;]/)
        .map((t) => t.trim())
        .filter(Boolean)
    );
  }

  // 関連要求の変換
  const relatedRequirements: string[] = [];
  if (Array.isArray(item.relatedRequirements || item.requirements || item.reqs)) {
    relatedRequirements.push(
      ...((item.relatedRequirements || item.requirements || item.reqs) as string[]).map(String)
    );
  }

  return {
    id,
    testId: item.testId ? String(item.testId) : undefined,
    name: String(item.name || item.title || item.testName || 'Unnamed'),
    objective: item.objective ? String(item.objective) : undefined,
    preconditions:
      item.preconditions || item.precondition
        ? String(item.preconditions || item.precondition)
        : undefined,
    procedure: item.procedure ? String(item.procedure) : undefined,
    expectedResult: item.expectedResult ? String(item.expectedResult) : undefined,
    testType: item.testType ? String(item.testType) : undefined,
    testTechnique: item.testTechnique ? String(item.testTechnique) : undefined,
    priority: item.priority ? String(item.priority) : undefined,
    category: item.category ? String(item.category) : undefined,
    steps: steps.length > 0 ? steps : undefined,
    relatedRequirements: relatedRequirements.length > 0 ? relatedRequirements : undefined,
    tags: tags.length > 0 ? tags : undefined,
    author: item.author ? String(item.author) : undefined,
    createdDate: item.createdDate ? String(item.createdDate) : undefined,
    lastModifiedDate: item.lastModifiedDate ? String(item.lastModifiedDate) : undefined,
  };
}

// ============================================
// インポート処理
// ============================================

/**
 * TDツールからテストケースをインポート
 */
export async function importFromTdTool(
  content: string,
  config: TdToolConfig,
  options: TdToolImportOptions,
  userId: bigint
): Promise<MigrationResult> {
  const startedAt = new Date().toISOString();
  const migrationId = `migration_td_${Date.now()}`;

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
    // パース
    let parseResult;
    if (config.format === 'json') {
      parseResult = parseTdToolJson(content);
    } else {
      // XML/CSVは将来的にサポート
      return {
        success: false,
        migrationId,
        source: 'TD_TOOL',
        status: 'FAILED',
        summary: {
          ...summary,
          errors: [
            {
              itemType: 'CASE',
              itemId: 'format',
              itemName: 'Format',
              errorMessage: '現在JSONフォーマットのみサポートしています。',
            },
          ],
        },
        startedAt,
        completedAt: new Date().toISOString(),
        projectId: options.projectId,
      };
    }

    if (!parseResult.success || !parseResult.data) {
      return {
        success: false,
        migrationId,
        source: 'TD_TOOL',
        status: 'FAILED',
        summary: {
          ...summary,
          errors: [
            {
              itemType: 'CASE',
              itemId: 'parse',
              itemName: 'Parse',
              errorMessage: parseResult.error || 'パースエラー',
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
          name: options.testSpecName || 'TD Tool Import',
          description: 'TDテスト設計ツールからインポートされたテストケース',
          status: 'DRAFT',
          version: '1',
        },
      });
      testSpecId = testSpec.id;
      createdTestSpecId = testSpec.id.toString();
    } else {
      testSpecId = BigInt(options.testSpecId!);
    }

    // テストスイート構造がある場合
    if (parseResult.data.testSuites) {
      await importTdToolTestSuites(parseResult.data.testSuites, testSpecId, null, options, summary);
    }

    // フラットなテストケースの場合
    if (parseResult.data.testCases) {
      // デフォルトセクションを作成
      const section = await prisma.testSection.create({
        data: {
          testSpecId,
          name: 'Imported from TD Tool',
          sortOrder: 0,
        },
      });
      summary.importedTestSuites++;
      summary.totalTestSuites++;

      await importTdToolTestCases(
        parseResult.data.testCases,
        testSpecId,
        section.id,
        options,
        summary
      );
    }

    return {
      success: summary.errors.length === 0,
      migrationId,
      source: 'TD_TOOL',
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
      source: 'TD_TOOL',
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
 * TDツールテストスイートをインポート
 */
async function importTdToolTestSuites(
  testSuites: TdToolTestSuite[],
  testSpecId: bigint,
  parentSectionId: bigint | null,
  options: TdToolImportOptions,
  summary: MigrationSummary
): Promise<void> {
  let sortOrder = 0;

  for (const suite of testSuites) {
    try {
      summary.totalTestSuites++;

      const section = await prisma.testSection.create({
        data: {
          testSpecId,
          parentId: parentSectionId,
          name: suite.name,
          sortOrder: sortOrder++,
        },
      });

      summary.importedTestSuites++;

      // テストケースをインポート
      if (suite.testCases) {
        await importTdToolTestCases(suite.testCases, testSpecId, section.id, options, summary);
      }

      // 子スイートを再帰的にインポート
      if (suite.children && options.preserveStructure !== false) {
        await importTdToolTestSuites(suite.children, testSpecId, section.id, options, summary);
      }
    } catch (error) {
      summary.errors.push({
        itemType: 'SUITE',
        itemId: suite.id,
        itemName: suite.name,
        errorMessage: error instanceof Error ? error.message : 'セクション作成エラー',
      });
    }
  }
}

/**
 * TDツールテストケースをインポート
 */
async function importTdToolTestCases(
  testCases: TdToolTestCase[],
  testSpecId: bigint,
  sectionId: bigint,
  options: TdToolImportOptions,
  summary: MigrationSummary
): Promise<void> {
  let sortOrder = 0;

  for (const tc of testCases) {
    try {
      summary.totalTestCases++;
      if (tc.steps) {
        summary.totalTestSteps += tc.steps.length;
      }

      // 優先度のマッピング
      const priority = mapTdToolPriority(tc.priority, options.defaultPriority);

      // テストタイプのマッピング
      const testType = mapTdToolTestType(tc.testType, options.defaultTestType);

      // テスト技法のマッピング
      const testTechnique = mapTdToolTestTechnique(tc.testTechnique, options.defaultTestTechnique);

      // テストケースを作成
      const testCase = await prisma.testCase.create({
        data: {
          testSpecId,
          sectionId,
          title: tc.name,
          description: tc.objective || tc.procedure || null,
          preconditions: tc.preconditions || null,
          expectedResult: tc.expectedResult || null,
          priority,
          testType,
          testTechnique,
          tags: tc.tags || [],
          referenceId: tc.testId || tc.id,
          classification: tc.category || null,
          sortOrder: sortOrder++,
          isMatrix: false,
        },
      });

      summary.importedTestCases++;

      // ステップのインポート
      if (tc.steps) {
        for (const step of tc.steps) {
          let actionMd = step.action;
          if (step.testData) {
            actionMd += `\n\nテストデータ: ${step.testData}`;
          }
          if (step.remarks) {
            actionMd += `\n\n備考: ${step.remarks}`;
          }

          await prisma.testStep.create({
            data: {
              testCaseId: testCase.id,
              stepNo: step.stepNo,
              actionMd,
              expectedMd: step.expectedResult || null,
            },
          });
          summary.importedTestSteps++;
        }
      }
    } catch (error) {
      summary.errors.push({
        itemType: 'CASE',
        itemId: tc.id,
        itemName: tc.name,
        errorMessage: error instanceof Error ? error.message : 'テストケース作成エラー',
      });
    }
  }
}

/**
 * 優先度をマッピング
 */
function mapTdToolPriority(
  priority?: string,
  defaultPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!priority) return defaultPriority || 'MEDIUM';

  const lower = priority.toLowerCase();
  if (lower.includes('critical') || lower === '致命的' || lower === '1') return 'CRITICAL';
  if (lower.includes('high') || lower === '高' || lower === '2') return 'HIGH';
  if (lower.includes('low') || lower === '低' || lower === '4') return 'LOW';
  return 'MEDIUM';
}

/**
 * テストタイプをマッピング
 */
function mapTdToolTestType(
  testType?: string,
  defaultTestType?: string
): 'FUNCTIONAL' | 'INTEGRATION' | 'E2E' | 'PERFORMANCE' | 'SECURITY' | 'USABILITY' | 'OTHER' {
  if (!testType) return (defaultTestType as 'FUNCTIONAL') || 'FUNCTIONAL';

  const lower = testType.toLowerCase();
  if (lower.includes('functional') || lower === '機能') return 'FUNCTIONAL';
  if (lower.includes('integration') || lower === '結合') return 'INTEGRATION';
  if (lower.includes('e2e') || lower.includes('end-to-end')) return 'E2E';
  if (lower.includes('performance') || lower === '性能') return 'PERFORMANCE';
  if (lower.includes('security') || lower === 'セキュリティ') return 'SECURITY';
  if (lower.includes('usability') || lower === 'ユーザビリティ') return 'USABILITY';
  return 'OTHER';
}

/**
 * テスト技法をマッピング
 */
function mapTdToolTestTechnique(
  testTechnique?: string,
  defaultTestTechnique?: string
):
  | 'EQUIVALENCE_PARTITIONING'
  | 'BOUNDARY_VALUE_ANALYSIS'
  | 'DECISION_TABLE'
  | 'STATE_TRANSITION'
  | 'EXPLORATORY'
  | 'REGRESSION'
  | 'OTHER' {
  if (!testTechnique) return (defaultTestTechnique as 'OTHER') || 'OTHER';

  const lower = testTechnique.toLowerCase();
  if (lower.includes('equivalence') || lower === '同値分割') return 'EQUIVALENCE_PARTITIONING';
  if (lower.includes('boundary') || lower === '境界値') return 'BOUNDARY_VALUE_ANALYSIS';
  if (lower.includes('decision') || lower === 'デシジョンテーブル') return 'DECISION_TABLE';
  if (lower.includes('state') || lower === '状態遷移') return 'STATE_TRANSITION';
  if (lower.includes('exploratory') || lower === '探索的') return 'EXPLORATORY';
  if (lower.includes('regression') || lower === '回帰') return 'REGRESSION';
  return 'OTHER';
}

// ============================================
// エクスポート処理
// ============================================

/**
 * T-NaviExからTDツール形式でエクスポート
 */
export async function exportToTdTool(
  options: TdToolExportOptions
): Promise<{ success: boolean; content?: string; error?: string }> {
  try {
    // テスト仕様書とテストケースを取得
    const testSpec = await prisma.testSpec.findUnique({
      where: { id: BigInt(options.testSpecId) },
      include: {
        sections: {
          orderBy: { sortOrder: 'asc' },
        },
      },
    });

    if (!testSpec) {
      return { success: false, error: 'テスト仕様書が見つかりません。' };
    }

    // テストケースを取得
    const testCases = await prisma.testCase.findMany({
      where: {
        testSpecId: testSpec.id,
        deletedAt: null,
      },
      include: {
        testSteps: {
          orderBy: { stepNo: 'asc' },
        },
        section: true,
      },
      orderBy: [{ sectionId: 'asc' }, { sortOrder: 'asc' }],
    });

    // TDツール形式に変換
    const exportData = {
      exportedAt: new Date().toISOString(),
      source: 'T-NaviEx',
      testSpec: {
        id: testSpec.id.toString(),
        name: testSpec.name,
        description: testSpec.description,
      },
      testCases: testCases.map((tc) => {
        const tdCase: TdToolTestCase = {
          id: tc.id.toString(),
          testId: tc.referenceId || tc.id.toString(),
          name: tc.title,
          objective: tc.description || undefined,
          preconditions: tc.preconditions || undefined,
          expectedResult: tc.expectedResult || undefined,
          testType: tc.testType,
          testTechnique: tc.testTechnique,
          priority: tc.priority,
          category: tc.classification || undefined,
          tags: tc.tags,
        };

        if (options.includeSteps && tc.testSteps.length > 0) {
          tdCase.steps = tc.testSteps.map((step) => ({
            stepNo: step.stepNo,
            action: step.actionMd,
            expectedResult: step.expectedMd || '',
          }));
        }

        if (options.includeMetadata) {
          tdCase.createdDate = tc.createdAt.toISOString();
          tdCase.lastModifiedDate = tc.updatedAt.toISOString();
        }

        return tdCase;
      }),
    };

    // フォーマットに応じて出力
    if (options.format === 'json') {
      return {
        success: true,
        content: JSON.stringify(exportData, null, 2),
      };
    }

    // TODO: XML, CSV形式のサポート
    return {
      success: false,
      error: '現在JSONフォーマットのみサポートしています。',
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'エクスポートエラー',
    };
  }
}

// ============================================
// プレビュー機能
// ============================================

/**
 * インポートプレビューを生成
 */
export function generateTdToolImportPreview(
  content: string,
  config: TdToolConfig
): ImportPreview | null {
  if (config.format !== 'json') return null;

  const parseResult = parseTdToolJson(content);
  if (!parseResult.success || !parseResult.data) return null;

  let totalTestCases = 0;
  let totalTestSteps = 0;
  const warnings: MigrationWarning[] = [];

  // テストスイートの場合
  if (parseResult.data.testSuites) {
    const countSuites = (suites: TdToolTestSuite[]): number => {
      let count = suites.length;
      for (const suite of suites) {
        if (suite.testCases) {
          totalTestCases += suite.testCases.length;
          suite.testCases.forEach((tc) => {
            if (tc.steps) totalTestSteps += tc.steps.length;
          });
        }
        if (suite.children) {
          count += countSuites(suite.children);
        }
      }
      return count;
    };

    const suiteCount = countSuites(parseResult.data.testSuites);

    // 簡易的なTestLink形式に変換
    const testSuites = parseResult.data.testSuites.map((suite) => ({
      id: suite.id,
      name: suite.name,
      details: suite.description,
      testCases: suite.testCases?.map((tc) => ({
        id: tc.id,
        name: tc.name,
        summary: tc.objective,
        preconditions: tc.preconditions,
        steps: tc.steps?.map((s) => ({
          stepNumber: s.stepNo,
          actions: s.action,
          expectedResults: s.expectedResult,
        })),
      })),
    }));

    return {
      testSuites: testSuites as unknown as ImportPreview['testSuites'],
      totalTestCases,
      totalTestSteps,
      estimatedTime: Math.ceil((totalTestCases + totalTestSteps) * 0.1),
      warnings,
    };
  }

  // フラットなテストケースの場合
  if (parseResult.data.testCases) {
    totalTestCases = parseResult.data.testCases.length;
    parseResult.data.testCases.forEach((tc) => {
      if (tc.steps) totalTestSteps += tc.steps.length;
    });

    return {
      testSuites: [
        {
          id: 'default',
          name: 'Imported from TD Tool',
          testCases: parseResult.data.testCases.map((tc) => ({
            id: tc.id,
            name: tc.name,
            summary: tc.objective,
            preconditions: tc.preconditions,
          })),
        },
      ] as unknown as ImportPreview['testSuites'],
      totalTestCases,
      totalTestSteps,
      estimatedTime: Math.ceil((totalTestCases + totalTestSteps) * 0.1),
      warnings,
    };
  }

  return null;
}

// ============================================
// バリデーション
// ============================================

/**
 * インポートオプションのバリデーション
 */
export function validateTdToolImportOptions(options: TdToolImportOptions): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!options.projectId || options.projectId.trim() === '') {
    errors.push('プロジェクトIDは必須です。');
  }

  if (options.createTestSpec && (!options.testSpecName || options.testSpecName.trim() === '')) {
    errors.push('テスト仕様書名は必須です。');
  }

  if (!options.createTestSpec && (!options.testSpecId || options.testSpecId.trim() === '')) {
    errors.push('テスト仕様書IDは必須です。');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
