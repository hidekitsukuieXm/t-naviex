/**
 * Zephyr Importer Service
 * Zephyrからのテストケース移行を担当するサービス
 */

import { prisma } from '@/lib/prisma';
import * as XLSX from 'xlsx';
import type {
  MigrationResult,
  MigrationSummary,
  MigrationWarning,
  ImportPreview,
} from '@/types/migration';

// ============================================
// Zephyr 型定義
// ============================================

export interface ZephyrTestCase {
  id: string;
  key?: string;
  name: string;
  description?: string;
  precondition?: string;
  priority?: 'High' | 'Medium' | 'Low';
  status?: string;
  labels?: string[];
  folder?: string;
  steps?: ZephyrTestStep[];
  customFields?: Record<string, string>;
}

export interface ZephyrTestStep {
  index: number;
  description: string;
  testData?: string;
  expectedResult: string;
}

export interface ZephyrImportOptions {
  projectId: string;
  testSpecId?: string;
  createTestSpec?: boolean;
  testSpecName?: string;
  preserveFolders?: boolean;
  importLabelsAsTags?: boolean;
  defaultPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  defaultTestType?: string;
  defaultTestTechnique?: string;
}

// ============================================
// JSON パーサー
// ============================================

/**
 * Zephyr JSON をパースしてテストケース構造を取得
 */
export function parseZephyrJson(jsonContent: string): {
  success: boolean;
  testCases?: ZephyrTestCase[];
  error?: string;
} {
  try {
    const data = JSON.parse(jsonContent);

    // 配列形式かオブジェクト形式かを判定
    let testCases: ZephyrTestCase[];

    if (Array.isArray(data)) {
      testCases = data.map(mapZephyrTestCase);
    } else if (data.testCases && Array.isArray(data.testCases)) {
      testCases = data.testCases.map(mapZephyrTestCase);
    } else if (data.tests && Array.isArray(data.tests)) {
      testCases = data.tests.map(mapZephyrTestCase);
    } else {
      return {
        success: false,
        error: 'テストケースが見つかりません。',
      };
    }

    return {
      success: true,
      testCases,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'JSONパースエラー',
    };
  }
}

/**
 * Zephyrテストケースをマッピング
 */
function mapZephyrTestCase(item: Record<string, unknown>): ZephyrTestCase {
  const id = String(item.id || item.key || `zephyr_${Date.now()}_${Math.random()}`);
  const key = item.key ? String(item.key) : undefined;
  const name = String(item.name || item.summary || item.title || 'Unnamed');
  const description = item.description ? String(item.description) : undefined;
  const precondition =
    item.precondition || item.preconditions
      ? String(item.precondition || item.preconditions)
      : undefined;

  // 優先度マッピング
  let priority: 'High' | 'Medium' | 'Low' | undefined;
  if (item.priority) {
    const p = String(item.priority).toLowerCase();
    if (p.includes('high') || p === '1') {
      priority = 'High';
    } else if (p.includes('low') || p === '3') {
      priority = 'Low';
    } else {
      priority = 'Medium';
    }
  }

  // ラベル
  const labels: string[] = [];
  if (Array.isArray(item.labels)) {
    labels.push(...item.labels.map(String));
  } else if (typeof item.labels === 'string') {
    labels.push(...item.labels.split(',').map((l) => l.trim()));
  }

  // フォルダ
  const folder =
    item.folder || item.folderPath || item.path
      ? String(item.folder || item.folderPath || item.path)
      : undefined;

  // ステップ
  const steps: ZephyrTestStep[] = [];
  if (Array.isArray(item.testSteps || item.steps)) {
    const rawSteps = (item.testSteps || item.steps) as Array<Record<string, unknown>>;
    rawSteps.forEach((step, index) => {
      steps.push({
        index: Number(step.index || step.orderId || index + 1),
        description: String(step.description || step.step || step.action || ''),
        testData: step.testData ? String(step.testData) : undefined,
        expectedResult: String(step.expectedResult || step.expected || ''),
      });
    });
  }

  return {
    id,
    key,
    name,
    description,
    precondition,
    priority,
    labels: labels.length > 0 ? labels : undefined,
    folder,
    steps: steps.length > 0 ? steps : undefined,
  };
}

// ============================================
// Excel パーサー
// ============================================

/**
 * Zephyr Excel をパースしてテストケース構造を取得
 */
export function parseZephyrExcel(fileBuffer: ArrayBuffer): {
  success: boolean;
  testCases?: ZephyrTestCase[];
  error?: string;
} {
  try {
    const workbook = XLSX.read(fileBuffer, { type: 'array' });
    const firstSheetName = workbook.SheetNames[0];
    const worksheet = workbook.Sheets[firstSheetName];

    // シートをJSONに変換
    const rows = XLSX.utils.sheet_to_json<Record<string, unknown>>(worksheet);

    if (rows.length === 0) {
      return {
        success: false,
        error: 'Excelファイルにデータがありません。',
      };
    }

    // カラムマッピングを推測
    const columnMapping = detectColumnMapping(rows[0]);
    const testCases = parseExcelRows(rows, columnMapping);

    return {
      success: true,
      testCases,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Excelパースエラー',
    };
  }
}

/**
 * カラムマッピングを検出
 */
function detectColumnMapping(row: Record<string, unknown>): Record<string, string> {
  const mapping: Record<string, string> = {};
  const keys = Object.keys(row);

  for (const key of keys) {
    const lowerKey = key.toLowerCase();

    if (lowerKey.includes('name') || lowerKey.includes('summary') || lowerKey.includes('title')) {
      mapping.name = key;
    } else if (lowerKey.includes('description') || lowerKey.includes('desc')) {
      mapping.description = key;
    } else if (lowerKey.includes('precondition') || lowerKey.includes('pre-condition')) {
      mapping.precondition = key;
    } else if (lowerKey.includes('priority')) {
      mapping.priority = key;
    } else if (lowerKey.includes('label') || lowerKey.includes('tag')) {
      mapping.labels = key;
    } else if (lowerKey.includes('folder') || lowerKey.includes('path')) {
      mapping.folder = key;
    } else if (lowerKey.includes('step') && !lowerKey.includes('expected')) {
      mapping.step = key;
    } else if (lowerKey.includes('expected') || lowerKey.includes('result')) {
      mapping.expectedResult = key;
    } else if (lowerKey.includes('id') || lowerKey === 'key') {
      mapping.id = key;
    }
  }

  return mapping;
}

/**
 * Excelの行をテストケースに変換
 */
function parseExcelRows(
  rows: Array<Record<string, unknown>>,
  mapping: Record<string, string>
): ZephyrTestCase[] {
  const testCases: ZephyrTestCase[] = [];
  let currentTestCase: ZephyrTestCase | null = null;

  for (const row of rows) {
    const name = mapping.name ? String(row[mapping.name] || '').trim() : '';

    // 新しいテストケースの開始
    if (name) {
      if (currentTestCase) {
        testCases.push(currentTestCase);
      }

      currentTestCase = {
        id: mapping.id ? String(row[mapping.id]) : `excel_${Date.now()}_${testCases.length}`,
        name,
        description: mapping.description ? String(row[mapping.description] || '') : undefined,
        precondition: mapping.precondition ? String(row[mapping.precondition] || '') : undefined,
        priority: mapExcelPriority(row[mapping.priority]),
        labels: mapping.labels ? parseLabels(row[mapping.labels]) : undefined,
        folder: mapping.folder ? String(row[mapping.folder] || '') : undefined,
        steps: [],
      };
    }

    // ステップの追加
    if (currentTestCase && mapping.step) {
      const stepDesc = String(row[mapping.step] || '').trim();
      const expectedResult = mapping.expectedResult
        ? String(row[mapping.expectedResult] || '').trim()
        : '';

      if (stepDesc) {
        currentTestCase.steps = currentTestCase.steps || [];
        currentTestCase.steps.push({
          index: currentTestCase.steps.length + 1,
          description: stepDesc,
          expectedResult,
        });
      }
    }
  }

  // 最後のテストケースを追加
  if (currentTestCase) {
    testCases.push(currentTestCase);
  }

  return testCases;
}

/**
 * Excel優先度をマッピング
 */
function mapExcelPriority(value: unknown): 'High' | 'Medium' | 'Low' | undefined {
  if (!value) return undefined;
  const str = String(value).toLowerCase();
  if (str.includes('high') || str === '1' || str === 'h') return 'High';
  if (str.includes('low') || str === '3' || str === 'l') return 'Low';
  return 'Medium';
}

/**
 * ラベルをパース
 */
function parseLabels(value: unknown): string[] | undefined {
  if (!value) return undefined;
  if (Array.isArray(value)) return value.map(String);
  return String(value)
    .split(/[,;]/)
    .map((l) => l.trim())
    .filter(Boolean);
}

// ============================================
// インポート処理
// ============================================

/**
 * Zephyrからテストケースをインポート
 */
export async function importFromZephyr(
  content: string | ArrayBuffer,
  format: 'json' | 'excel',
  options: ZephyrImportOptions,
  userId: bigint
): Promise<MigrationResult> {
  const startedAt = new Date().toISOString();
  const migrationId = `migration_zephyr_${Date.now()}`;

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
    if (format === 'json') {
      parseResult = parseZephyrJson(content as string);
    } else {
      parseResult = parseZephyrExcel(content as ArrayBuffer);
    }

    if (!parseResult.success || !parseResult.testCases) {
      return {
        success: false,
        migrationId,
        source: 'ZEPHYR',
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

    const testCases = parseResult.testCases;
    summary.totalTestCases = testCases.length;
    summary.totalTestSteps = testCases.reduce((sum, tc) => sum + (tc.steps?.length || 0), 0);

    // フォルダ構造の解析
    const folders = new Set<string>();
    if (options.preserveFolders) {
      testCases.forEach((tc) => {
        if (tc.folder) {
          folders.add(tc.folder);
        }
      });
    }
    summary.totalTestSuites = folders.size || 1;

    // テスト仕様書の取得または作成
    let testSpecId: bigint;
    let createdTestSpecId: string | undefined;

    if (options.createTestSpec) {
      const testSpec = await prisma.testSpec.create({
        data: {
          projectId: BigInt(options.projectId),
          name: options.testSpecName || 'Zephyr Import',
          description: 'Zephyrからインポートされたテストケース',
          status: 'DRAFT',
          version: '1',
        },
      });
      testSpecId = testSpec.id;
      createdTestSpecId = testSpec.id.toString();
    } else {
      testSpecId = BigInt(options.testSpecId!);
    }

    // フォルダ→セクションのマッピング
    const folderSectionMap = new Map<string, bigint>();

    if (options.preserveFolders && folders.size > 0) {
      for (const folder of folders) {
        const section = await prisma.testSection.create({
          data: {
            testSpecId,
            name: folder,
            sortOrder: folderSectionMap.size,
          },
        });
        folderSectionMap.set(folder, section.id);
        summary.importedTestSuites++;
      }
    } else {
      // デフォルトセクション
      const section = await prisma.testSection.create({
        data: {
          testSpecId,
          name: 'Imported from Zephyr',
          sortOrder: 0,
        },
      });
      folderSectionMap.set('default', section.id);
      summary.importedTestSuites++;
    }

    // テストケースのインポート
    for (const tc of testCases) {
      await importZephyrTestCase(tc, testSpecId, folderSectionMap, options, summary);
    }

    return {
      success: summary.errors.length === 0,
      migrationId,
      source: 'ZEPHYR',
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
      source: 'ZEPHYR',
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
 * Zephyrテストケースをインポート
 */
async function importZephyrTestCase(
  tc: ZephyrTestCase,
  testSpecId: bigint,
  folderSectionMap: Map<string, bigint>,
  options: ZephyrImportOptions,
  summary: MigrationSummary
): Promise<void> {
  try {
    // セクションの決定
    const sectionId =
      tc.folder && folderSectionMap.has(tc.folder)
        ? folderSectionMap.get(tc.folder)!
        : folderSectionMap.get('default') || folderSectionMap.values().next().value!;

    // 優先度のマッピング
    const priority = mapZephyrPriority(tc.priority, options.defaultPriority);

    // タグの設定
    const tags: string[] = [];
    if (options.importLabelsAsTags && tc.labels) {
      tags.push(...tc.labels);
    }

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
        tags,
        referenceId: tc.key || null,
        sortOrder: summary.importedTestCases,
        isMatrix: false,
      },
    });

    summary.importedTestCases++;

    // ステップのインポート
    if (tc.steps) {
      for (const step of tc.steps) {
        await prisma.testStep.create({
          data: {
            testCaseId: testCase.id,
            stepNo: step.index,
            actionMd:
              step.description + (step.testData ? `\n\nテストデータ: ${step.testData}` : ''),
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

/**
 * Zephyr優先度をマッピング
 */
function mapZephyrPriority(
  priority?: 'High' | 'Medium' | 'Low',
  defaultPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  switch (priority) {
    case 'High':
      return 'HIGH';
    case 'Medium':
      return 'MEDIUM';
    case 'Low':
      return 'LOW';
    default:
      return defaultPriority || 'MEDIUM';
  }
}

// ============================================
// プレビュー機能
// ============================================

/**
 * インポートプレビューを生成
 */
export function generateZephyrImportPreview(
  content: string | ArrayBuffer,
  format: 'json' | 'excel'
): ImportPreview | null {
  let parseResult;
  if (format === 'json') {
    parseResult = parseZephyrJson(content as string);
  } else {
    parseResult = parseZephyrExcel(content as ArrayBuffer);
  }

  if (!parseResult.success || !parseResult.testCases) {
    return null;
  }

  const testCases = parseResult.testCases;
  const warnings: MigrationWarning[] = [];
  let totalTestSteps = 0;

  // フォルダ構造の構築
  const folders = new Map<string, ZephyrTestCase[]>();

  for (const tc of testCases) {
    const folder = tc.folder || 'default';
    if (!folders.has(folder)) {
      folders.set(folder, []);
    }
    folders.get(folder)!.push(tc);

    if (tc.steps) {
      totalTestSteps += tc.steps.length;
    }

    // 警告チェック
    if (!tc.name || tc.name.trim() === '') {
      warnings.push({
        itemType: 'CASE',
        itemId: tc.id,
        itemName: 'Unnamed',
        warningMessage: 'テストケース名が空です。',
      });
    }
  }

  // TestLink形式に変換してプレビュー用データを生成
  const testSuites = Array.from(folders.entries()).map(([folderName, cases]) => ({
    id: folderName,
    name: folderName === 'default' ? 'Imported from Zephyr' : folderName,
    testCases: cases.map((tc) => ({
      id: tc.id,
      name: tc.name,
      summary: tc.description,
      preconditions: tc.precondition,
      importance: tc.priority === 'High' ? 'HIGH' : tc.priority === 'Low' ? 'LOW' : 'MEDIUM',
      steps: tc.steps?.map((s) => ({
        stepNumber: s.index,
        actions: s.description,
        expectedResults: s.expectedResult,
      })),
    })),
  }));

  const estimatedTime = Math.ceil((testCases.length + totalTestSteps) * 0.1);

  return {
    testSuites: testSuites as unknown as ImportPreview['testSuites'],
    totalTestCases: testCases.length,
    totalTestSteps,
    estimatedTime,
    warnings,
  };
}

// ============================================
// バリデーション
// ============================================

/**
 * Zephyrデータのバリデーション
 */
export function validateZephyrData(
  content: string | ArrayBuffer,
  format: 'json' | 'excel'
): {
  valid: boolean;
  error?: string;
} {
  if (format === 'json') {
    if (typeof content !== 'string' || content.trim() === '') {
      return { valid: false, error: 'JSONコンテンツが空です。' };
    }
    const result = parseZephyrJson(content);
    if (!result.success) {
      return { valid: false, error: result.error };
    }
    if (!result.testCases || result.testCases.length === 0) {
      return { valid: false, error: 'テストケースが見つかりません。' };
    }
  } else {
    if (!content || (content instanceof ArrayBuffer && content.byteLength === 0)) {
      return { valid: false, error: 'Excelファイルが空です。' };
    }
    const result = parseZephyrExcel(content as ArrayBuffer);
    if (!result.success) {
      return { valid: false, error: result.error };
    }
    if (!result.testCases || result.testCases.length === 0) {
      return { valid: false, error: 'テストケースが見つかりません。' };
    }
  }

  return { valid: true };
}
