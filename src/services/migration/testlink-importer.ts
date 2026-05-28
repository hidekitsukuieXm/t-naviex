/**
 * TestLink Importer Service
 * TestLinkからのテストケース移行を担当するサービス
 */

import { prisma } from '@/lib/prisma';
import type {
  TestLinkTestSuite,
  TestLinkTestCase,
  TestLinkTestStep,
  TestLinkImportOptions,
  MigrationResult,
  MigrationSummary,
  MigrationWarning,
  ImportPreview,
} from '@/types/migration';

// ============================================
// XML パーサー
// ============================================

/**
 * TestLink XML をパースしてテストスイート構造を取得
 */
export function parseTestLinkXml(xmlContent: string): {
  success: boolean;
  testSuites?: TestLinkTestSuite[];
  error?: string;
} {
  try {
    // DOMParser を使用してXMLをパース
    const parser = new DOMParser();
    const xmlDoc = parser.parseFromString(xmlContent, 'text/xml');

    // パースエラーのチェック
    const parseError = xmlDoc.querySelector('parsererror');
    if (parseError) {
      return {
        success: false,
        error: 'XMLのパースに失敗しました: ' + parseError.textContent,
      };
    }

    // ルート要素の取得
    const root = xmlDoc.documentElement;
    if (root.tagName !== 'testsuite' && root.tagName !== 'testsuites') {
      return {
        success: false,
        error: '無効なTestLink XMLフォーマットです。',
      };
    }

    // テストスイートのパース
    const testSuites = parseTestSuites(root);

    return {
      success: true,
      testSuites,
    };
  } catch (error) {
    return {
      success: false,
      error: error instanceof Error ? error.message : 'XMLパースエラー',
    };
  }
}

/**
 * テストスイートをパース
 */
function parseTestSuites(element: Element): TestLinkTestSuite[] {
  const suites: TestLinkTestSuite[] = [];

  // 直接のtestsuiteノードを探す
  if (element.tagName === 'testsuite') {
    const suite = parseTestSuiteElement(element);
    if (suite) {
      suites.push(suite);
    }
  } else {
    // 子要素からtestsuiteを探す
    const children = Array.from(element.children);
    for (const child of children) {
      if (child.tagName.toLowerCase() === 'testsuite') {
        const suite = parseTestSuiteElement(child);
        if (suite) {
          suites.push(suite);
        }
      }
    }
  }

  return suites;
}

/**
 * 単一のテストスイート要素をパース
 */
function parseTestSuiteElement(element: Element): TestLinkTestSuite | null {
  const id = element.getAttribute('id') || generateId();
  const name = element.getAttribute('name') || getElementText(element, 'name') || 'Unnamed Suite';
  const details = getElementText(element, 'details') || undefined;

  // テストケースのパース - 直接の子要素のみ
  const testCases: TestLinkTestCase[] = [];
  const childSuites: TestLinkTestSuite[] = [];

  const children = Array.from(element.children);
  for (const child of children) {
    const tagName = child.tagName.toLowerCase();
    if (tagName === 'testcase') {
      const testCase = parseTestCaseElement(child);
      if (testCase) {
        testCases.push(testCase);
      }
    } else if (tagName === 'testsuite') {
      const childSuite = parseTestSuiteElement(child);
      if (childSuite) {
        childSuites.push(childSuite);
      }
    }
  }

  return {
    id,
    name,
    details,
    testCases: testCases.length > 0 ? testCases : undefined,
    childSuites: childSuites.length > 0 ? childSuites : undefined,
  };
}

/**
 * テストケース要素をパース
 */
function parseTestCaseElement(element: Element): TestLinkTestCase | null {
  const id = element.getAttribute('id') || generateId();
  const externalId = element.getAttribute('internalid') || undefined;
  const name = element.getAttribute('name') || getElementText(element, 'name') || 'Unnamed Case';
  const summary = getElementText(element, 'summary') || undefined;
  const preconditions = getElementText(element, 'preconditions') || undefined;

  // 優先度のマッピング
  const importanceEl = element.querySelector('importance');
  let importance: 'HIGH' | 'MEDIUM' | 'LOW' | undefined;
  if (importanceEl) {
    const impText = importanceEl.textContent?.toUpperCase();
    if (impText === 'HIGH' || impText === '3') {
      importance = 'HIGH';
    } else if (impText === 'LOW' || impText === '1') {
      importance = 'LOW';
    } else {
      importance = 'MEDIUM';
    }
  }

  // 実行タイプ
  const executionTypeEl = element.querySelector('execution_type');
  const executionType = executionTypeEl?.textContent === '2' ? 'AUTOMATED' : 'MANUAL';

  // ステップのパース
  const steps: TestLinkTestStep[] = [];
  const stepsEl = element.querySelector('steps');
  if (stepsEl) {
    const stepElements = stepsEl.querySelectorAll('step');
    for (const stepEl of stepElements) {
      const step = parseTestStepElement(stepEl);
      if (step) {
        steps.push(step);
      }
    }
  }

  // キーワードのパース
  const keywords: string[] = [];
  const keywordsEl = element.querySelector('keywords');
  if (keywordsEl) {
    const keywordElements = keywordsEl.querySelectorAll('keyword');
    for (const kwEl of keywordElements) {
      const kwName = kwEl.getAttribute('name') || kwEl.textContent;
      if (kwName) {
        keywords.push(kwName.trim());
      }
    }
  }

  // カスタムフィールドのパース
  const customFields: Record<string, string> = {};
  const customFieldsEl = element.querySelector('custom_fields');
  if (customFieldsEl) {
    const cfElements = customFieldsEl.querySelectorAll('custom_field');
    for (const cfEl of cfElements) {
      const cfName = getElementText(cfEl, 'name');
      const cfValue = getElementText(cfEl, 'value');
      if (cfName && cfValue) {
        customFields[cfName] = cfValue;
      }
    }
  }

  return {
    id,
    externalId,
    name,
    summary,
    preconditions,
    steps: steps.length > 0 ? steps : undefined,
    importance,
    executionType,
    keywords: keywords.length > 0 ? keywords : undefined,
    customFields: Object.keys(customFields).length > 0 ? customFields : undefined,
  };
}

/**
 * テストステップ要素をパース
 */
function parseTestStepElement(element: Element): TestLinkTestStep | null {
  const stepNumberEl = element.querySelector('step_number');
  const stepNumber = stepNumberEl ? parseInt(stepNumberEl.textContent || '1', 10) : 1;
  const actions = getElementText(element, 'actions') || '';
  const expectedResults = getElementText(element, 'expectedresults') || '';
  const executionTypeEl = element.querySelector('execution_type');
  const executionType = executionTypeEl?.textContent === '2' ? 'AUTOMATED' : 'MANUAL';

  return {
    stepNumber,
    actions,
    expectedResults,
    executionType,
  };
}

/**
 * 要素内のテキストコンテンツを取得（直接の子要素から）
 */
function getElementText(parent: Element, tagName: string): string | null {
  const children = Array.from(parent.children);
  const el = children.find((child) => child.tagName.toLowerCase() === tagName.toLowerCase());
  return el?.textContent?.trim() || null;
}

/**
 * ユニークIDを生成
 */
function generateId(): string {
  return `temp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
}

// ============================================
// インポート処理
// ============================================

/**
 * TestLinkからテストケースをインポート
 */
export async function importFromTestLink(
  xmlContent: string,
  options: TestLinkImportOptions,
  userId: bigint
): Promise<MigrationResult> {
  const startedAt = new Date().toISOString();
  const migrationId = `migration_${Date.now()}`;

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
    const parseResult = parseTestLinkXml(xmlContent);
    if (!parseResult.success || !parseResult.testSuites) {
      return {
        success: false,
        migrationId,
        source: 'TESTLINK',
        status: 'FAILED',
        summary,
        startedAt,
        completedAt: new Date().toISOString(),
        projectId: options.projectId,
        testSpecId: options.testSpecId,
      };
    }

    const testSuites = parseResult.testSuites;

    // カウント
    countItems(testSuites, summary);

    // テスト仕様書の取得または作成
    let testSpecId: bigint;
    let createdTestSpecId: string | undefined;

    if (options.createTestSpec) {
      const testSpec = await prisma.testSpec.create({
        data: {
          projectId: BigInt(options.projectId),
          name: options.testSpecName || 'TestLink Import',
          description: 'TestLinkからインポートされたテストケース',
          status: 'DRAFT',
          version: 1,
          createdById: userId,
        },
      });
      testSpecId = testSpec.id;
      createdTestSpecId = testSpec.id.toString();
    } else {
      testSpecId = BigInt(options.testSpecId!);
    }

    // インポート実行
    await importTestSuites(testSuites, testSpecId, null, options, summary, userId);

    return {
      success: summary.errors.length === 0,
      migrationId,
      source: 'TESTLINK',
      status: summary.errors.length === 0 ? 'COMPLETED' : 'COMPLETED',
      summary,
      startedAt,
      completedAt: new Date().toISOString(),
      projectId: options.projectId,
      testSpecId: options.testSpecId,
      createdTestSpecId,
    };
  } catch (error) {
    summary.errors.push({
      itemType: 'SUITE',
      itemId: 'root',
      itemName: 'Root',
      errorMessage: error instanceof Error ? error.message : 'インポートエラー',
    });

    return {
      success: false,
      migrationId,
      source: 'TESTLINK',
      status: 'FAILED',
      summary,
      startedAt,
      completedAt: new Date().toISOString(),
      projectId: options.projectId,
      testSpecId: options.testSpecId,
    };
  }
}

/**
 * アイテム数をカウント
 */
function countItems(testSuites: TestLinkTestSuite[], summary: MigrationSummary): void {
  for (const suite of testSuites) {
    summary.totalTestSuites++;

    if (suite.testCases) {
      for (const tc of suite.testCases) {
        summary.totalTestCases++;
        if (tc.steps) {
          summary.totalTestSteps += tc.steps.length;
        }
      }
    }

    if (suite.childSuites) {
      countItems(suite.childSuites, summary);
    }
  }
}

/**
 * テストスイートをインポート
 */
async function importTestSuites(
  testSuites: TestLinkTestSuite[],
  testSpecId: bigint,
  parentSectionId: bigint | null,
  options: TestLinkImportOptions,
  summary: MigrationSummary,
  userId: bigint
): Promise<void> {
  let sortOrder = 0;

  for (const suite of testSuites) {
    try {
      // セクションを作成
      const section = await prisma.testSection.create({
        data: {
          testSpecId,
          parentId: parentSectionId,
          name: suite.name,
          description: suite.details || null,
          sortOrder: sortOrder++,
        },
      });

      summary.importedTestSuites++;

      // テストケースをインポート
      if (suite.testCases) {
        await importTestCases(suite.testCases, testSpecId, section.id, options, summary, userId);
      }

      // 子スイートを再帰的にインポート
      if (suite.childSuites && options.preserveHierarchy !== false) {
        await importTestSuites(suite.childSuites, testSpecId, section.id, options, summary, userId);
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
 * テストケースをインポート
 */
async function importTestCases(
  testCases: TestLinkTestCase[],
  testSpecId: bigint,
  sectionId: bigint,
  options: TestLinkImportOptions,
  summary: MigrationSummary,
  userId: bigint
): Promise<void> {
  let sortOrder = 0;

  for (const tc of testCases) {
    try {
      // 優先度のマッピング
      const priority = mapPriority(tc.importance, options.defaultPriority);

      // タグの設定
      const tags: string[] = [];
      if (options.importKeywordsAsTags && tc.keywords) {
        tags.push(...tc.keywords);
      }

      // テストケースを作成
      const testCase = await prisma.testCase.create({
        data: {
          testSpecId,
          sectionId,
          title: tc.name,
          description: tc.summary || null,
          preconditions: tc.preconditions || null,
          priority,
          testType: (options.defaultTestType as 'FUNCTIONAL') || 'FUNCTIONAL',
          testTechnique: (options.defaultTestTechnique as 'OTHER') || 'OTHER',
          tags,
          referenceId: tc.externalId || null,
          sortOrder: sortOrder++,
          isMatrix: false,
        },
      });

      summary.importedTestCases++;

      // テストステップをインポート
      if (tc.steps) {
        await importTestSteps(tc.steps, testCase.id, summary);
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
 * テストステップをインポート
 */
async function importTestSteps(
  steps: TestLinkTestStep[],
  testCaseId: bigint,
  summary: MigrationSummary
): Promise<void> {
  for (const step of steps) {
    try {
      await prisma.testStep.create({
        data: {
          testCaseId,
          stepNo: step.stepNumber,
          actionMd: stripHtml(step.actions),
          expectedMd: stripHtml(step.expectedResults) || null,
        },
      });

      summary.importedTestSteps++;
    } catch (error) {
      summary.errors.push({
        itemType: 'STEP',
        itemId: `${testCaseId}_${step.stepNumber}`,
        itemName: `Step ${step.stepNumber}`,
        errorMessage: error instanceof Error ? error.message : 'ステップ作成エラー',
      });
    }
  }
}

/**
 * 優先度をマッピング
 */
function mapPriority(
  importance?: 'HIGH' | 'MEDIUM' | 'LOW',
  defaultPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!importance) {
    return defaultPriority || 'MEDIUM';
  }

  switch (importance) {
    case 'HIGH':
      return 'HIGH';
    case 'MEDIUM':
      return 'MEDIUM';
    case 'LOW':
      return 'LOW';
    default:
      return defaultPriority || 'MEDIUM';
  }
}

/**
 * HTMLタグを除去
 */
function stripHtml(html: string): string {
  if (!html) return '';
  // 基本的なHTMLタグを除去
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<p>/gi, '')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .trim();
}

// ============================================
// プレビュー機能
// ============================================

/**
 * インポートプレビューを生成
 */
export function generateImportPreview(xmlContent: string): ImportPreview | null {
  const parseResult = parseTestLinkXml(xmlContent);
  if (!parseResult.success || !parseResult.testSuites) {
    return null;
  }

  const testSuites = parseResult.testSuites;
  let totalTestCases = 0;
  let totalTestSteps = 0;
  const warnings: MigrationWarning[] = [];

  const countRecursive = (suites: TestLinkTestSuite[]): void => {
    for (const suite of suites) {
      if (suite.testCases) {
        for (const tc of suite.testCases) {
          totalTestCases++;
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
      }
      if (suite.childSuites) {
        countRecursive(suite.childSuites);
      }
    }
  };

  countRecursive(testSuites);

  // 推定時間（1件あたり0.1秒として計算）
  const estimatedTime = Math.ceil((totalTestCases + totalTestSteps) * 0.1);

  return {
    testSuites,
    totalTestCases,
    totalTestSteps,
    estimatedTime,
    warnings,
  };
}

// ============================================
// バリデーション
// ============================================

/**
 * XMLコンテンツのバリデーション
 */
export function validateTestLinkXml(xmlContent: string): {
  valid: boolean;
  error?: string;
} {
  if (!xmlContent || xmlContent.trim() === '') {
    return { valid: false, error: 'XMLコンテンツが空です。' };
  }

  const parseResult = parseTestLinkXml(xmlContent);
  if (!parseResult.success) {
    return { valid: false, error: parseResult.error };
  }

  if (!parseResult.testSuites || parseResult.testSuites.length === 0) {
    return { valid: false, error: 'テストスイートが見つかりません。' };
  }

  return { valid: true };
}
