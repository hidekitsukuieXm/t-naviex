/**
 * Generic XML Importer Service
 * 設定可能なフィールドマッピングによる汎用XMLインポート
 */

import { prisma } from '@/lib/prisma';
import type {
  MigrationResult,
  MigrationSummary,
  MigrationWarning,
  FieldMapping,
} from '@/types/migration';

// ============================================
// XML Import 型定義
// ============================================

export interface XmlImportConfig {
  rootElement: string;
  testCaseElement: string;
  stepElement?: string;
  sectionElement?: string;
}

export interface XmlFieldMapping {
  testCase: {
    title: string;
    description?: string;
    preconditions?: string;
    expectedResult?: string;
    priority?: string;
    testType?: string;
    tags?: string;
    referenceId?: string;
  };
  step?: {
    action: string;
    expected?: string;
    stepNo?: string;
  };
  section?: {
    name: string;
    description?: string;
  };
}

export interface XmlImportOptions {
  projectId: string;
  testSpecId?: string;
  createTestSpec?: boolean;
  testSpecName?: string;
  config: XmlImportConfig;
  fieldMapping: XmlFieldMapping;
  defaultPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  defaultTestType?: string;
  defaultTestTechnique?: string;
}

export interface XmlPreviewData {
  sampleRecords: Array<Record<string, unknown>>;
  detectedFields: string[];
  totalRecords: number;
}

// ============================================
// XML パーサー
// ============================================

/**
 * XMLをパースして構造を取得
 */
export function parseXml(xmlContent: string): {
  success: boolean;
  document?: Document;
  error?: string;
} {
  try {
    const parser = new DOMParser();
    const doc = parser.parseFromString(xmlContent, 'text/xml');

    // パースエラーのチェック
    const parseError = doc.querySelector('parsererror');
    if (parseError) {
      return {
        success: false,
        error: 'XMLのパースに失敗しました: ' + parseError.textContent,
      };
    }

    return {
      success: true,
      document: doc,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'XMLパースエラー',
    };
  }
}

/**
 * XMLからフィールドを検出
 */
export function detectXmlFields(xmlContent: string): {
  success: boolean;
  fields?: string[];
  sampleData?: Array<Record<string, string>>;
  error?: string;
} {
  const parseResult = parseXml(xmlContent);
  if (!parseResult.success || !parseResult.document) {
    return { success: false, error: parseResult.error };
  }

  const doc = parseResult.document;
  const fields = new Set<string>();
  const sampleData: Array<Record<string, string>> = [];

  // すべての要素を走査してフィールドを検出
  const allElements = doc.querySelectorAll('*');
  for (const element of allElements) {
    // 子要素を持たないテキストノードのみを検出
    if (element.children.length === 0 && element.textContent?.trim()) {
      fields.add(element.tagName);
    }
    // 属性も検出
    for (const attr of element.attributes) {
      fields.add(`@${attr.name}`);
    }
  }

  // サンプルデータの抽出（最初の数件）
  const rootElement = doc.documentElement;
  const topLevelElements = Array.from(rootElement.children).slice(0, 5);

  for (const element of topLevelElements) {
    const record: Record<string, string> = {};
    extractFieldValues(element, record, '');
    if (Object.keys(record).length > 0) {
      sampleData.push(record);
    }
  }

  return {
    success: true,
    fields: Array.from(fields).sort(),
    sampleData,
  };
}

/**
 * 要素からフィールド値を抽出
 */
function extractFieldValues(
  element: Element,
  record: Record<string, string>,
  prefix: string
): void {
  const path = prefix ? `${prefix}/${element.tagName}` : element.tagName;

  // 属性の抽出
  for (const attr of element.attributes) {
    record[`${path}/@${attr.name}`] = attr.value;
  }

  // テキストコンテンツの抽出
  if (element.children.length === 0) {
    const text = element.textContent?.trim();
    if (text) {
      record[path] = text;
    }
  } else {
    // 子要素の再帰処理
    for (const child of element.children) {
      extractFieldValues(child, record, path);
    }
  }
}

// ============================================
// インポート処理
// ============================================

/**
 * XMLからテストケースをインポート
 */
export async function importFromXml(
  xmlContent: string,
  options: XmlImportOptions,
  userId: bigint
): Promise<MigrationResult> {
  const startedAt = new Date().toISOString();
  const migrationId = `migration_xml_${Date.now()}`;

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
    // XMLをパース
    const parseResult = parseXml(xmlContent);
    if (!parseResult.success || !parseResult.document) {
      return {
        success: false,
        migrationId,
        source: 'XML',
        status: 'FAILED',
        summary: {
          ...summary,
          errors: [
            {
              itemType: 'CASE',
              itemId: 'parse',
              itemName: 'Parse',
              errorMessage: parseResult.error || 'XMLパースエラー',
            },
          ],
        },
        startedAt,
        completedAt: new Date().toISOString(),
        projectId: options.projectId,
      };
    }

    const doc = parseResult.document;
    const config = options.config;
    const mapping = options.fieldMapping;

    // テスト仕様書の取得または作成
    let testSpecId: bigint;
    let createdTestSpecId: string | undefined;

    if (options.createTestSpec) {
      const testSpec = await prisma.testSpec.create({
        data: {
          projectId: BigInt(options.projectId),
          name: options.testSpecName || 'XML Import',
          description: 'XMLからインポートされたテストケース',
          status: 'DRAFT',
          version: '1',
        },
      });
      testSpecId = testSpec.id;
      createdTestSpecId = testSpec.id.toString();
    } else {
      testSpecId = BigInt(options.testSpecId!);
    }

    // セクションの処理
    const sectionMap = new Map<string, bigint>();

    if (config.sectionElement && mapping.section) {
      const sectionElements = doc.querySelectorAll(config.sectionElement);
      summary.totalTestSuites = sectionElements.length;

      let sectionOrder = 0;
      for (const sectionEl of sectionElements) {
        const sectionName = getElementValue(sectionEl, mapping.section.name) || 'Unnamed Section';
        const sectionDesc = mapping.section.description
          ? getElementValue(sectionEl, mapping.section.description)
          : null;

        try {
          const section = await prisma.testSection.create({
            data: {
              testSpecId,
              name: sectionName,
              sortOrder: sectionOrder++,
            },
          });
          sectionMap.set(sectionName, section.id);
          summary.importedTestSuites++;
        } catch (error) {
          summary.errors.push({
            itemType: 'SUITE',
            itemId: sectionName,
            itemName: sectionName,
            errorMessage: error instanceof Error ? error.message : 'セクション作成エラー',
          });
        }
      }
    }

    // デフォルトセクション
    if (sectionMap.size === 0) {
      const section = await prisma.testSection.create({
        data: {
          testSpecId,
          name: 'Imported from XML',
          sortOrder: 0,
        },
      });
      sectionMap.set('default', section.id);
      summary.importedTestSuites++;
      summary.totalTestSuites++;
    }

    // テストケースの処理
    const testCaseElements = doc.querySelectorAll(config.testCaseElement);
    summary.totalTestCases = testCaseElements.length;

    let caseOrder = 0;
    for (const tcEl of testCaseElements) {
      await importXmlTestCase(
        tcEl,
        testSpecId,
        sectionMap,
        config,
        mapping,
        options,
        summary,
        caseOrder++
      );
    }

    return {
      success: summary.errors.length === 0,
      migrationId,
      source: 'XML',
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
      source: 'XML',
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
 * XMLテストケースをインポート
 */
async function importXmlTestCase(
  element: Element,
  testSpecId: bigint,
  sectionMap: Map<string, bigint>,
  config: XmlImportConfig,
  mapping: XmlFieldMapping,
  options: XmlImportOptions,
  summary: MigrationSummary,
  sortOrder: number
): Promise<void> {
  try {
    const tcMapping = mapping.testCase;

    // タイトル
    const title = getElementValue(element, tcMapping.title) || 'Unnamed Test Case';

    // 説明
    const description = tcMapping.description
      ? getElementValue(element, tcMapping.description)
      : null;

    // 事前条件
    const preconditions = tcMapping.preconditions
      ? getElementValue(element, tcMapping.preconditions)
      : null;

    // 期待結果
    const expectedResult = tcMapping.expectedResult
      ? getElementValue(element, tcMapping.expectedResult)
      : null;

    // 優先度
    let priority = options.defaultPriority || 'MEDIUM';
    if (tcMapping.priority) {
      const priorityValue = getElementValue(element, tcMapping.priority);
      if (priorityValue) {
        priority = mapXmlPriority(priorityValue);
      }
    }

    // タグ
    const tags: string[] = [];
    if (tcMapping.tags) {
      const tagsValue = getElementValue(element, tcMapping.tags);
      if (tagsValue) {
        tags.push(
          ...tagsValue
            .split(/[,;]/)
            .map((t) => t.trim())
            .filter(Boolean)
        );
      }
    }

    // 参照ID
    const referenceId = tcMapping.referenceId
      ? getElementValue(element, tcMapping.referenceId)
      : null;

    // セクションの決定
    const sectionId = sectionMap.get('default') || sectionMap.values().next().value!;

    // テストケースを作成
    const testCase = await prisma.testCase.create({
      data: {
        testSpecId,
        sectionId,
        title,
        description,
        preconditions,
        expectedResult,
        priority,
        testType: (options.defaultTestType as 'FUNCTIONAL') || 'FUNCTIONAL',
        testTechnique: (options.defaultTestTechnique as 'OTHER') || 'OTHER',
        tags,
        referenceId,
        sortOrder,
        isMatrix: false,
      },
    });

    summary.importedTestCases++;

    // ステップの処理
    if (config.stepElement && mapping.step) {
      const stepElements = element.querySelectorAll(config.stepElement);
      summary.totalTestSteps += stepElements.length;

      let stepNo = 1;
      for (const stepEl of stepElements) {
        const stepMapping = mapping.step;

        const action = getElementValue(stepEl, stepMapping.action) || '';
        const expected = stepMapping.expected
          ? getElementValue(stepEl, stepMapping.expected)
          : null;
        const explicitStepNo = stepMapping.stepNo
          ? parseInt(getElementValue(stepEl, stepMapping.stepNo) || String(stepNo), 10)
          : stepNo;

        if (action) {
          await prisma.testStep.create({
            data: {
              testCaseId: testCase.id,
              stepNo: explicitStepNo,
              actionMd: action,
              expectedMd: expected,
            },
          });
          summary.importedTestSteps++;
        }

        stepNo++;
      }
    }
  } catch (error) {
    const title = getElementValue(element, mapping.testCase.title) || 'Unknown';
    summary.errors.push({
      itemType: 'CASE',
      itemId: title,
      itemName: title,
      errorMessage: error instanceof Error ? error.message : 'テストケース作成エラー',
    });
  }
}

/**
 * 要素から値を取得（XPath風パス対応）
 */
function getElementValue(element: Element, path: string): string | null {
  if (!path) return null;

  // 属性の場合
  if (path.startsWith('@')) {
    return element.getAttribute(path.substring(1)) || null;
  }

  // 単純なタグ名の場合
  if (!path.includes('/')) {
    const child = Array.from(element.children).find(
      (c) => c.tagName.toLowerCase() === path.toLowerCase()
    );
    return child?.textContent?.trim() || null;
  }

  // パスの場合
  const parts = path.split('/');
  let current: Element | null = element;

  for (const part of parts) {
    if (!current) return null;

    if (part.startsWith('@')) {
      return current.getAttribute(part.substring(1)) || null;
    }

    current =
      Array.from(current.children).find((c) => c.tagName.toLowerCase() === part.toLowerCase()) ||
      null;
  }

  return current?.textContent?.trim() || null;
}

/**
 * 優先度をマッピング
 */
function mapXmlPriority(value: string): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  const lower = value.toLowerCase();
  if (lower.includes('critical') || lower.includes('blocker') || lower === '1') return 'CRITICAL';
  if (lower.includes('high') || lower.includes('major') || lower === '2') return 'HIGH';
  if (lower.includes('low') || lower.includes('minor') || lower === '4' || lower === '5')
    return 'LOW';
  return 'MEDIUM';
}

// ============================================
// プレビュー機能
// ============================================

/**
 * XMLインポートのプレビューを生成
 */
export function generateXmlImportPreview(
  xmlContent: string,
  config: XmlImportConfig
): XmlPreviewData | null {
  const parseResult = parseXml(xmlContent);
  if (!parseResult.success || !parseResult.document) {
    return null;
  }

  const doc = parseResult.document;
  const testCaseElements = doc.querySelectorAll(config.testCaseElement);

  const sampleRecords: Array<Record<string, unknown>> = [];
  const detectedFields = new Set<string>();

  // 最初の5件をサンプルとして抽出
  const samples = Array.from(testCaseElements).slice(0, 5);

  for (const element of samples) {
    const record: Record<string, string> = {};
    extractFieldValues(element, record, '');
    sampleRecords.push(record);

    // フィールドを収集
    Object.keys(record).forEach((field) => detectedFields.add(field));
  }

  return {
    sampleRecords,
    detectedFields: Array.from(detectedFields).sort(),
    totalRecords: testCaseElements.length,
  };
}

// ============================================
// バリデーション
// ============================================

/**
 * XMLインポート設定のバリデーション
 */
export function validateXmlImportOptions(options: XmlImportOptions): {
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

  if (!options.config.testCaseElement || options.config.testCaseElement.trim() === '') {
    errors.push('テストケース要素の指定は必須です。');
  }

  if (!options.fieldMapping.testCase.title || options.fieldMapping.testCase.title.trim() === '') {
    errors.push('タイトルフィールドのマッピングは必須です。');
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
