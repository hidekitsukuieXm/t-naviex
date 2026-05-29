/**
 * Xray Importer Service
 * Xray (Jira)からのテストケース移行を担当するサービス
 */

import { prisma } from '@/lib/prisma';
import type { MigrationResult, MigrationSummary, MigrationWarning } from '@/types/migration';

// ============================================
// Xray 型定義
// ============================================

export interface XrayConfig {
  jiraBaseUrl: string;
  clientId?: string;
  clientSecret?: string;
  username?: string;
  password?: string;
  projectKey: string;
  cloudOrServer: 'cloud' | 'server';
}

export interface XrayTestSet {
  id: string;
  key: string;
  summary: string;
  description?: string;
  tests?: XrayTest[];
}

export interface XrayTest {
  id: string;
  key: string;
  summary: string;
  description?: string;
  type?: string;
  status?: string;
  priority?: {
    id: string;
    name: string;
  };
  labels?: string[];
  steps?: XrayTestStep[];
  precondition?: string;
  folder?: string;
  customFields?: Record<string, unknown>;
}

export interface XrayTestStep {
  id: string;
  index: number;
  action: string;
  data?: string;
  result: string;
  attachments?: Array<{
    id: string;
    filename: string;
  }>;
}

export interface XrayImportOptions {
  projectId: string;
  testSpecId?: string;
  createTestSpec?: boolean;
  testSpecName?: string;
  preserveFolders?: boolean;
  importLabelsAsTags?: boolean;
  testSetKey?: string;
  jqlFilter?: string;
  defaultPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW';
  defaultTestType?: string;
  defaultTestTechnique?: string;
}

// ============================================
// Xray API クライアント
// ============================================

/**
 * Xray API クライアント
 */
export class XrayClient {
  private jiraBaseUrl: string;
  private authHeader: string;
  private projectKey: string;
  private isCloud: boolean;

  constructor(config: XrayConfig) {
    this.jiraBaseUrl = config.jiraBaseUrl.replace(/\/$/, '');
    this.projectKey = config.projectKey;
    this.isCloud = config.cloudOrServer === 'cloud';

    // 認証ヘッダーの設定
    if (config.clientId && config.clientSecret) {
      // OAuth for Cloud
      this.authHeader = `Basic ${Buffer.from(`${config.clientId}:${config.clientSecret}`).toString('base64')}`;
    } else if (config.username && config.password) {
      // Basic Auth for Server/DC
      this.authHeader = `Basic ${Buffer.from(`${config.username}:${config.password}`).toString('base64')}`;
    } else {
      this.authHeader = '';
    }
  }

  /**
   * Jira REST API リクエストを実行
   */
  private async jiraRequest<T>(
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const apiBase = this.isCloud ? '/rest/api/3' : '/rest/api/2';
      const response = await fetch(`${this.jiraBaseUrl}${apiBase}${endpoint}`, {
        method,
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Jira API error: ${response.status} - ${errorText}`,
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
   * Xray REST API リクエストを実行
   */
  private async xrayRequest<T>(
    endpoint: string,
    method: string = 'GET',
    body?: unknown
  ): Promise<{ success: boolean; data?: T; error?: string }> {
    try {
      const apiBase = this.isCloud ? '/rest/raven/1.0' : '/rest/raven/2.0';
      const response = await fetch(`${this.jiraBaseUrl}${apiBase}${endpoint}`, {
        method,
        headers: {
          Authorization: this.authHeader,
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: body ? JSON.stringify(body) : undefined,
      });

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Xray API error: ${response.status} - ${errorText}`,
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
   * JQLでテストを検索
   */
  async searchTests(
    jql: string,
    startAt: number = 0,
    maxResults: number = 50
  ): Promise<{ success: boolean; tests?: XrayTest[]; total?: number; error?: string }> {
    const searchJql = jql || `project = ${this.projectKey} AND issuetype = Test`;

    const result = await this.jiraRequest<{
      issues: Array<{
        id: string;
        key: string;
        fields: Record<string, unknown>;
      }>;
      total: number;
    }>(
      `/search?jql=${encodeURIComponent(searchJql)}&startAt=${startAt}&maxResults=${maxResults}&fields=*all`
    );

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const tests: XrayTest[] = result.data.issues.map((issue) => ({
      id: issue.id,
      key: issue.key,
      summary: String(issue.fields.summary || ''),
      description: issue.fields.description
        ? this.parseDescription(issue.fields.description)
        : undefined,
      priority: issue.fields.priority as { id: string; name: string } | undefined,
      labels: issue.fields.labels as string[] | undefined,
      status: issue.fields.status
        ? String((issue.fields.status as Record<string, string>).name)
        : undefined,
    }));

    return {
      success: true,
      tests,
      total: result.data.total,
    };
  }

  /**
   * テストのステップを取得
   */
  async getTestSteps(
    testKey: string
  ): Promise<{ success: boolean; steps?: XrayTestStep[]; error?: string }> {
    const result = await this.xrayRequest<{
      steps: Array<{
        id: string;
        index: number;
        step: { raw?: string; rendered?: string };
        data: { raw?: string; rendered?: string };
        result: { raw?: string; rendered?: string };
      }>;
    }>(`/api/test/${testKey}/step`);

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    const steps: XrayTestStep[] = (result.data.steps || []).map((step) => ({
      id: String(step.id),
      index: step.index,
      action: step.step?.raw || step.step?.rendered || '',
      data: step.data?.raw || step.data?.rendered,
      result: step.result?.raw || step.result?.rendered || '',
    }));

    return { success: true, steps };
  }

  /**
   * テストセットのテストを取得
   */
  async getTestSetTests(
    testSetKey: string
  ): Promise<{ success: boolean; testKeys?: string[]; error?: string }> {
    const result = await this.xrayRequest<{ tests: Array<{ key: string }> }>(
      `/api/testset/${testSetKey}/test`
    );

    if (!result.success || !result.data) {
      return { success: false, error: result.error };
    }

    return {
      success: true,
      testKeys: result.data.tests.map((t) => t.key),
    };
  }

  /**
   * 接続テスト
   */
  async testConnection(): Promise<{ success: boolean; error?: string }> {
    const result = await this.jiraRequest(`/project/${this.projectKey}`);
    return { success: result.success, error: result.error };
  }

  /**
   * Jira記法のdescriptionをプレーンテキストに変換
   */
  private parseDescription(description: unknown): string {
    if (typeof description === 'string') {
      return description;
    }

    // Atlassian Document Format (ADF) の場合
    if (description && typeof description === 'object' && 'content' in description) {
      return this.parseAdfContent((description as Record<string, unknown>).content);
    }

    return '';
  }

  /**
   * ADF contentをプレーンテキストに変換
   */
  private parseAdfContent(content: unknown): string {
    if (!Array.isArray(content)) return '';

    return content
      .map((node: Record<string, unknown>) => {
        if (node.type === 'text') {
          return node.text;
        }
        if (node.type === 'paragraph' && node.content) {
          return this.parseAdfContent(node.content) + '\n';
        }
        if (node.content) {
          return this.parseAdfContent(node.content);
        }
        return '';
      })
      .join('');
  }
}

// ============================================
// インポート処理
// ============================================

/**
 * Xrayからテストケースをインポート
 */
export async function importFromXray(
  config: XrayConfig,
  options: XrayImportOptions,
  userId: bigint
): Promise<MigrationResult> {
  const startedAt = new Date().toISOString();
  const migrationId = `migration_xray_${Date.now()}`;

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
    const client = new XrayClient(config);

    // 接続テスト
    const connectionTest = await client.testConnection();
    if (!connectionTest.success) {
      return {
        success: false,
        migrationId,
        source: 'XRAY',
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
          name: options.testSpecName || 'Xray Import',
          description: 'Xrayからインポートされたテストケース',
          status: 'DRAFT',
          version: '1',
        },
      });
      testSpecId = testSpec.id;
      createdTestSpecId = testSpec.id.toString();
    } else {
      testSpecId = BigInt(options.testSpecId!);
    }

    // テストキーの取得
    let testKeys: string[] = [];

    if (options.testSetKey) {
      // テストセットからテストを取得
      const testSetResult = await client.getTestSetTests(options.testSetKey);
      if (testSetResult.success && testSetResult.testKeys) {
        testKeys = testSetResult.testKeys;
      }
    }

    // JQL検索でテストを取得
    const jql = options.jqlFilter || `project = ${config.projectKey} AND issuetype = Test`;
    let startAt = 0;
    const maxResults = 50;
    let hasMore = true;

    while (hasMore) {
      const searchResult = await client.searchTests(jql, startAt, maxResults);
      if (!searchResult.success || !searchResult.tests) {
        summary.warnings.push({
          itemType: 'CASE',
          itemId: 'search',
          itemName: 'Search',
          warningMessage: searchResult.error || 'テスト検索に失敗しました。',
        });
        break;
      }

      const tests = searchResult.tests;
      summary.totalTestCases += tests.length;

      // フォルダ構造の解析
      const folders = new Set<string>();
      tests.forEach((test) => {
        if (test.folder) {
          folders.add(test.folder);
        }
      });

      // セクションマッピング
      const folderSectionMap = new Map<string, bigint>();

      if (options.preserveFolders && folders.size > 0) {
        summary.totalTestSuites += folders.size;
        for (const folder of folders) {
          if (!folderSectionMap.has(folder)) {
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
        }
      }

      // デフォルトセクション
      if (folderSectionMap.size === 0) {
        const section = await prisma.testSection.create({
          data: {
            testSpecId,
            name: options.testSetKey ? `Test Set: ${options.testSetKey}` : 'Imported from Xray',
            sortOrder: 0,
          },
        });
        folderSectionMap.set('default', section.id);
        summary.importedTestSuites++;
        summary.totalTestSuites++;
      }

      // テストケースのインポート
      for (const test of tests) {
        // テストセット指定時はフィルタリング
        if (testKeys.length > 0 && !testKeys.includes(test.key)) {
          summary.skippedItems++;
          continue;
        }

        // ステップの取得
        const stepsResult = await client.getTestSteps(test.key);
        if (stepsResult.success && stepsResult.steps) {
          test.steps = stepsResult.steps;
          summary.totalTestSteps += stepsResult.steps.length;
        }

        await importXrayTest(test, testSpecId, folderSectionMap, options, summary);
      }

      hasMore = searchResult.total ? startAt + tests.length < searchResult.total : false;
      startAt += maxResults;
    }

    return {
      success: summary.errors.length === 0,
      migrationId,
      source: 'XRAY',
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
      source: 'XRAY',
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
 * Xrayテストをインポート
 */
async function importXrayTest(
  test: XrayTest,
  testSpecId: bigint,
  folderSectionMap: Map<string, bigint>,
  options: XrayImportOptions,
  summary: MigrationSummary
): Promise<void> {
  try {
    // セクションの決定
    const sectionId =
      test.folder && folderSectionMap.has(test.folder)
        ? folderSectionMap.get(test.folder)!
        : folderSectionMap.get('default') || folderSectionMap.values().next().value!;

    // 優先度のマッピング
    const priority = mapXrayPriority(test.priority?.name, options.defaultPriority);

    // タグの設定
    const tags: string[] = [];
    if (options.importLabelsAsTags && test.labels) {
      tags.push(...test.labels);
    }

    // テストケースを作成
    const testCase = await prisma.testCase.create({
      data: {
        testSpecId,
        sectionId,
        title: test.summary,
        description: test.description || null,
        preconditions: test.precondition || null,
        priority,
        testType: (options.defaultTestType as 'FUNCTIONAL') || 'FUNCTIONAL',
        testTechnique: (options.defaultTestTechnique as 'OTHER') || 'OTHER',
        tags,
        referenceId: test.key,
        sortOrder: summary.importedTestCases,
        isMatrix: false,
      },
    });

    summary.importedTestCases++;

    // ステップのインポート
    if (test.steps) {
      for (const step of test.steps) {
        const actionMd = step.data ? `${step.action}\n\nテストデータ: ${step.data}` : step.action;

        await prisma.testStep.create({
          data: {
            testCaseId: testCase.id,
            stepNo: step.index,
            actionMd,
            expectedMd: step.result || null,
          },
        });
        summary.importedTestSteps++;
      }
    }
  } catch (error) {
    summary.errors.push({
      itemType: 'CASE',
      itemId: test.id,
      itemName: test.summary,
      errorMessage: error instanceof Error ? error.message : 'テストケース作成エラー',
    });
  }
}

/**
 * Xray優先度をマッピング
 */
function mapXrayPriority(
  priorityName?: string,
  defaultPriority?: 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW'
): 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' {
  if (!priorityName) return defaultPriority || 'MEDIUM';

  const lower = priorityName.toLowerCase();
  if (lower.includes('highest') || lower.includes('blocker') || lower.includes('critical'))
    return 'CRITICAL';
  if (lower.includes('high') || lower.includes('major')) return 'HIGH';
  if (
    lower.includes('low') ||
    lower.includes('minor') ||
    lower.includes('trivial') ||
    lower.includes('lowest')
  )
    return 'LOW';
  return 'MEDIUM';
}

// ============================================
// バリデーション
// ============================================

/**
 * Xray設定のバリデーション
 */
export function validateXrayConfig(config: XrayConfig): {
  valid: boolean;
  errors: string[];
} {
  const errors: string[] = [];

  if (!config.jiraBaseUrl || config.jiraBaseUrl.trim() === '') {
    errors.push('Jira URLは必須です。');
  } else {
    try {
      new URL(config.jiraBaseUrl);
    } catch {
      errors.push('Jira URLが無効です。');
    }
  }

  if (!config.projectKey || config.projectKey.trim() === '') {
    errors.push('プロジェクトキーは必須です。');
  }

  if (config.cloudOrServer === 'cloud') {
    if (!config.clientId || !config.clientSecret) {
      errors.push('Cloud環境ではClient IDとClient Secretが必要です。');
    }
  } else {
    if (!config.username || !config.password) {
      errors.push('Server/DC環境ではユーザー名とパスワードが必要です。');
    }
  }

  return {
    valid: errors.length === 0,
    errors,
  };
}
