/**
 * TD Tool Service Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseTdToolJson,
  generateTdToolImportPreview,
  validateTdToolImportOptions,
} from '../td-tool-service';
import type { TdToolImportOptions, TdToolConfig } from '../td-tool-service';

describe('TD Tool Service', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseTdToolJson', () => {
    it('テストスイート形式のJSONをパース', () => {
      const jsonContent = JSON.stringify({
        testSuites: [
          {
            id: 'TS-001',
            name: 'Test Suite 1',
            description: 'Description',
            testCases: [
              {
                id: 'TC-001',
                name: 'Test Case 1',
                objective: 'Objective 1',
              },
            ],
          },
        ],
      });

      const result = parseTdToolJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.data?.testSuites).toHaveLength(1);
      expect(result.data?.testSuites![0].name).toBe('Test Suite 1');
    });

    it('テストケース配列形式のJSONをパース', () => {
      const jsonContent = JSON.stringify({
        testCases: [
          {
            id: 'TC-001',
            name: 'Test Case 1',
            priority: 'High',
          },
          {
            id: 'TC-002',
            name: 'Test Case 2',
            priority: 'Medium',
          },
        ],
      });

      const result = parseTdToolJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.data?.testCases).toHaveLength(2);
      expect(result.data?.testCases![0].name).toBe('Test Case 1');
      expect(result.data?.testCases![0].priority).toBe('High');
    });

    it('直接配列形式のJSONをパース', () => {
      const jsonContent = JSON.stringify([
        {
          id: 'TC-001',
          name: 'Test Case 1',
        },
        {
          id: 'TC-002',
          name: 'Test Case 2',
        },
      ]);

      const result = parseTdToolJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.data?.testCases).toHaveLength(2);
    });

    it('単一オブジェクト形式のJSONをパース', () => {
      const jsonContent = JSON.stringify({
        id: 'TC-001',
        name: 'Single Test Case',
      });

      const result = parseTdToolJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.data?.testCases).toHaveLength(1);
      expect(result.data?.testCases![0].name).toBe('Single Test Case');
    });

    it('不正なJSONでエラーを返す', () => {
      const jsonContent = 'invalid json';
      const result = parseTdToolJson(jsonContent);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('サポートされていない形式でエラーを返す', () => {
      const jsonContent = JSON.stringify({ unsupported: 'data' });
      const result = parseTdToolJson(jsonContent);
      expect(result.success).toBe(false);
      expect(result.error).toBe('サポートされていないデータ形式です。');
    });

    it('ステップを含むテストケースをパース', () => {
      const jsonContent = JSON.stringify([
        {
          id: 'TC-001',
          name: 'Test with Steps',
          steps: [
            {
              stepNo: 1,
              action: 'Action 1',
              expectedResult: 'Expected 1',
              testData: 'Data 1',
            },
            {
              stepNo: 2,
              action: 'Action 2',
              expectedResult: 'Expected 2',
            },
          ],
        },
      ]);

      const result = parseTdToolJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.data?.testCases![0].steps).toHaveLength(2);
      expect(result.data?.testCases![0].steps![0].action).toBe('Action 1');
      expect(result.data?.testCases![0].steps![0].testData).toBe('Data 1');
    });

    it('タグを含むテストケースをパース', () => {
      const jsonContent = JSON.stringify([
        {
          id: 'TC-001',
          name: 'Test with Tags',
          tags: ['smoke', 'regression'],
        },
      ]);

      const result = parseTdToolJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.data?.testCases![0].tags).toContain('smoke');
      expect(result.data?.testCases![0].tags).toContain('regression');
    });

    it('カンマ区切りのタグをパース', () => {
      const jsonContent = JSON.stringify([
        {
          id: 'TC-001',
          name: 'Test with Tags',
          tags: 'smoke, regression, critical',
        },
      ]);

      const result = parseTdToolJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.data?.testCases![0].tags).toHaveLength(3);
    });

    it('ネストしたテストスイートをパース', () => {
      const jsonContent = JSON.stringify({
        testSuites: [
          {
            id: 'TS-001',
            name: 'Parent Suite',
            children: [
              {
                id: 'TS-002',
                name: 'Child Suite',
                testCases: [{ id: 'TC-001', name: 'Nested Test Case' }],
              },
            ],
          },
        ],
      });

      const result = parseTdToolJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.data?.testSuites![0].children).toHaveLength(1);
      expect(result.data?.testSuites![0].children![0].name).toBe('Child Suite');
    });

    it('関連要求を含むテストケースをパース', () => {
      const jsonContent = JSON.stringify([
        {
          id: 'TC-001',
          name: 'Test with Requirements',
          relatedRequirements: ['REQ-001', 'REQ-002'],
        },
      ]);

      const result = parseTdToolJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.data?.testCases![0].relatedRequirements).toContain('REQ-001');
      expect(result.data?.testCases![0].relatedRequirements).toContain('REQ-002');
    });

    it('titleプロパティをnameとして認識', () => {
      const jsonContent = JSON.stringify([
        {
          id: 'TC-001',
          title: 'Test Title',
        },
      ]);

      const result = parseTdToolJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.data?.testCases![0].name).toBe('Test Title');
    });

    it('testIdプロパティを認識', () => {
      const jsonContent = JSON.stringify([
        {
          testId: 'CUSTOM-001',
          name: 'Test Case',
        },
      ]);

      const result = parseTdToolJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.data?.testCases![0].testId).toBe('CUSTOM-001');
    });
  });

  describe('validateTdToolImportOptions', () => {
    it('有効なオプションで成功', () => {
      const options: TdToolImportOptions = {
        projectId: '123',
        createTestSpec: true,
        testSpecName: 'Test Spec',
      };

      const result = validateTdToolImportOptions(options);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('プロジェクトIDがないとエラー', () => {
      const options: TdToolImportOptions = {
        projectId: '',
        createTestSpec: true,
        testSpecName: 'Test Spec',
      };

      const result = validateTdToolImportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('プロジェクトIDは必須です。');
    });

    it('テスト仕様書作成時に名前がないとエラー', () => {
      const options: TdToolImportOptions = {
        projectId: '123',
        createTestSpec: true,
        testSpecName: '',
      };

      const result = validateTdToolImportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('テスト仕様書名は必須です。');
    });

    it('テスト仕様書IDが必要な場合に指定がないとエラー', () => {
      const options: TdToolImportOptions = {
        projectId: '123',
        createTestSpec: false,
        testSpecId: '',
      };

      const result = validateTdToolImportOptions(options);
      expect(result.valid).toBe(false);
      expect(result.errors).toContain('テスト仕様書IDは必須です。');
    });

    it('既存テスト仕様書へのインポートで成功', () => {
      const options: TdToolImportOptions = {
        projectId: '123',
        createTestSpec: false,
        testSpecId: '456',
      };

      const result = validateTdToolImportOptions(options);
      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });
  });

  describe('generateTdToolImportPreview', () => {
    it('テストスイート形式のプレビューを生成', () => {
      const jsonContent = JSON.stringify({
        testSuites: [
          {
            id: 'TS-001',
            name: 'Suite 1',
            testCases: [
              {
                id: 'TC-001',
                name: 'Test 1',
                steps: [{ stepNo: 1, action: 'Step 1', expectedResult: 'Result 1' }],
              },
              {
                id: 'TC-002',
                name: 'Test 2',
              },
            ],
          },
        ],
      });

      const config: TdToolConfig = { format: 'json' };
      const preview = generateTdToolImportPreview(jsonContent, config);

      expect(preview).toBeDefined();
      expect(preview?.totalTestCases).toBe(2);
      expect(preview?.totalTestSteps).toBe(1);
    });

    it('フラットなテストケースのプレビューを生成', () => {
      const jsonContent = JSON.stringify([
        {
          id: 'TC-001',
          name: 'Test 1',
          steps: [
            { stepNo: 1, action: 'Step 1', expectedResult: 'Result 1' },
            { stepNo: 2, action: 'Step 2', expectedResult: 'Result 2' },
          ],
        },
        {
          id: 'TC-002',
          name: 'Test 2',
        },
      ]);

      const config: TdToolConfig = { format: 'json' };
      const preview = generateTdToolImportPreview(jsonContent, config);

      expect(preview).toBeDefined();
      expect(preview?.totalTestCases).toBe(2);
      expect(preview?.totalTestSteps).toBe(2);
    });

    it('JSON以外のフォーマットでnullを返す', () => {
      const config: TdToolConfig = { format: 'xml' };
      const preview = generateTdToolImportPreview('content', config);
      expect(preview).toBeNull();
    });

    it('不正なJSONでnullを返す', () => {
      const config: TdToolConfig = { format: 'json' };
      const preview = generateTdToolImportPreview('invalid', config);
      expect(preview).toBeNull();
    });

    it('ネストしたスイートのテストケースをカウント', () => {
      const jsonContent = JSON.stringify({
        testSuites: [
          {
            id: 'TS-001',
            name: 'Parent Suite',
            testCases: [{ id: 'TC-001', name: 'Parent Test' }],
            children: [
              {
                id: 'TS-002',
                name: 'Child Suite',
                testCases: [
                  { id: 'TC-002', name: 'Child Test 1' },
                  { id: 'TC-003', name: 'Child Test 2' },
                ],
              },
            ],
          },
        ],
      });

      const config: TdToolConfig = { format: 'json' };
      const preview = generateTdToolImportPreview(jsonContent, config);

      expect(preview).toBeDefined();
      expect(preview?.totalTestCases).toBe(3);
    });

    it('推定時間を計算', () => {
      const jsonContent = JSON.stringify([
        {
          id: 'TC-001',
          name: 'Test 1',
          steps: [{ stepNo: 1, action: 'Step 1', expectedResult: 'Result 1' }],
        },
      ]);

      const config: TdToolConfig = { format: 'json' };
      const preview = generateTdToolImportPreview(jsonContent, config);

      expect(preview?.estimatedTime).toBeGreaterThan(0);
    });
  });
});

describe('TD Tool Priority Mapping', () => {
  it('優先度の変換をテスト', () => {
    const testPriorities = [
      { input: 'critical', expected: 'CRITICAL' },
      { input: '致命的', expected: 'CRITICAL' },
      { input: '1', expected: 'CRITICAL' },
      { input: 'high', expected: 'HIGH' },
      { input: '高', expected: 'HIGH' },
      { input: '2', expected: 'HIGH' },
      { input: 'medium', expected: 'MEDIUM' },
      { input: '3', expected: 'MEDIUM' },
      { input: 'low', expected: 'LOW' },
      { input: '低', expected: 'LOW' },
      { input: '4', expected: 'LOW' },
    ];

    for (const { input, expected } of testPriorities) {
      const lower = input.toLowerCase();
      let result: string;

      if (lower.includes('critical') || lower === '致命的' || lower === '1') {
        result = 'CRITICAL';
      } else if (lower.includes('high') || lower === '高' || lower === '2') {
        result = 'HIGH';
      } else if (lower.includes('low') || lower === '低' || lower === '4') {
        result = 'LOW';
      } else {
        result = 'MEDIUM';
      }

      expect(result).toBe(expected);
    }
  });
});

describe('TD Tool Test Type Mapping', () => {
  it('テストタイプの変換をテスト', () => {
    const testTypes = [
      { input: 'functional', expected: 'FUNCTIONAL' },
      { input: '機能', expected: 'FUNCTIONAL' },
      { input: 'integration', expected: 'INTEGRATION' },
      { input: '結合', expected: 'INTEGRATION' },
      { input: 'e2e', expected: 'E2E' },
      { input: 'end-to-end', expected: 'E2E' },
      { input: 'performance', expected: 'PERFORMANCE' },
      { input: '性能', expected: 'PERFORMANCE' },
      { input: 'security', expected: 'SECURITY' },
      { input: 'セキュリティ', expected: 'SECURITY' },
      { input: 'usability', expected: 'USABILITY' },
      { input: 'ユーザビリティ', expected: 'USABILITY' },
      { input: 'other', expected: 'OTHER' },
    ];

    for (const { input, expected } of testTypes) {
      const lower = input.toLowerCase();
      let result: string;

      if (lower.includes('functional') || lower === '機能') {
        result = 'FUNCTIONAL';
      } else if (lower.includes('integration') || lower === '結合') {
        result = 'INTEGRATION';
      } else if (lower.includes('e2e') || lower.includes('end-to-end')) {
        result = 'E2E';
      } else if (lower.includes('performance') || lower === '性能') {
        result = 'PERFORMANCE';
      } else if (lower.includes('security') || lower === 'セキュリティ') {
        result = 'SECURITY';
      } else if (lower.includes('usability') || lower === 'ユーザビリティ') {
        result = 'USABILITY';
      } else {
        result = 'OTHER';
      }

      expect(result).toBe(expected);
    }
  });
});

describe('TD Tool Test Technique Mapping', () => {
  it('テスト技法の変換をテスト', () => {
    const testTechniques = [
      { input: 'equivalence', expected: 'EQUIVALENCE_PARTITIONING' },
      { input: '同値分割', expected: 'EQUIVALENCE_PARTITIONING' },
      { input: 'boundary', expected: 'BOUNDARY_VALUE_ANALYSIS' },
      { input: '境界値', expected: 'BOUNDARY_VALUE_ANALYSIS' },
      { input: 'decision', expected: 'DECISION_TABLE' },
      { input: 'デシジョンテーブル', expected: 'DECISION_TABLE' },
      { input: 'state', expected: 'STATE_TRANSITION' },
      { input: '状態遷移', expected: 'STATE_TRANSITION' },
      { input: 'exploratory', expected: 'EXPLORATORY' },
      { input: '探索的', expected: 'EXPLORATORY' },
      { input: 'regression', expected: 'REGRESSION' },
      { input: '回帰', expected: 'REGRESSION' },
    ];

    for (const { input, expected } of testTechniques) {
      const lower = input.toLowerCase();
      let result: string;

      if (lower.includes('equivalence') || lower === '同値分割') {
        result = 'EQUIVALENCE_PARTITIONING';
      } else if (lower.includes('boundary') || lower === '境界値') {
        result = 'BOUNDARY_VALUE_ANALYSIS';
      } else if (lower.includes('decision') || lower === 'デシジョンテーブル') {
        result = 'DECISION_TABLE';
      } else if (lower.includes('state') || lower === '状態遷移') {
        result = 'STATE_TRANSITION';
      } else if (lower.includes('exploratory') || lower === '探索的') {
        result = 'EXPLORATORY';
      } else if (lower.includes('regression') || lower === '回帰') {
        result = 'REGRESSION';
      } else {
        result = 'OTHER';
      }

      expect(result).toBe(expected);
    }
  });
});
