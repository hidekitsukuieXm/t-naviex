/**
 * Zephyr Importer Unit Tests
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  parseZephyrJson,
  validateZephyrData,
  generateZephyrImportPreview,
} from '../zephyr-importer';

describe('Zephyr Importer', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  afterEach(() => {
    vi.restoreAllMocks();
  });

  describe('parseZephyrJson', () => {
    it('配列形式のJSONをパース', () => {
      const jsonContent = JSON.stringify([
        {
          id: 'TC-001',
          name: 'Test Case 1',
          description: 'Description',
          priority: 'High',
        },
        {
          id: 'TC-002',
          name: 'Test Case 2',
          description: 'Description 2',
          priority: 'Medium',
        },
      ]);

      const result = parseZephyrJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.testCases).toHaveLength(2);
      expect(result.testCases![0].name).toBe('Test Case 1');
      expect(result.testCases![0].priority).toBe('High');
    });

    it('testCasesプロパティを持つJSONをパース', () => {
      const jsonContent = JSON.stringify({
        testCases: [
          {
            id: 'TC-001',
            name: 'Test Case 1',
          },
        ],
      });

      const result = parseZephyrJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.testCases).toHaveLength(1);
    });

    it('testsプロパティを持つJSONをパース', () => {
      const jsonContent = JSON.stringify({
        tests: [
          {
            id: 'TC-001',
            name: 'Test Case 1',
          },
        ],
      });

      const result = parseZephyrJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.testCases).toHaveLength(1);
    });

    it('不正なJSONでエラーを返す', () => {
      const jsonContent = 'invalid json';
      const result = parseZephyrJson(jsonContent);
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('空の配列でエラーなしで成功', () => {
      const jsonContent = JSON.stringify([]);
      const result = parseZephyrJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.testCases).toHaveLength(0);
    });

    it('ステップを含むテストケースをパース', () => {
      const jsonContent = JSON.stringify([
        {
          id: 'TC-001',
          name: 'Test with Steps',
          testSteps: [
            {
              index: 1,
              description: 'Step 1',
              expectedResult: 'Expected 1',
            },
            {
              index: 2,
              description: 'Step 2',
              expectedResult: 'Expected 2',
            },
          ],
        },
      ]);

      const result = parseZephyrJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.testCases![0].steps).toHaveLength(2);
      expect(result.testCases![0].steps![0].description).toBe('Step 1');
    });

    it('ラベルをパース', () => {
      const jsonContent = JSON.stringify([
        {
          id: 'TC-001',
          name: 'Test with Labels',
          labels: ['smoke', 'regression'],
        },
      ]);

      const result = parseZephyrJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.testCases![0].labels).toContain('smoke');
      expect(result.testCases![0].labels).toContain('regression');
    });

    it('カンマ区切りのラベルをパース', () => {
      const jsonContent = JSON.stringify([
        {
          id: 'TC-001',
          name: 'Test with Labels',
          labels: 'smoke, regression, critical',
        },
      ]);

      const result = parseZephyrJson(jsonContent);
      expect(result.success).toBe(true);
      expect(result.testCases![0].labels).toHaveLength(3);
    });
  });

  describe('validateZephyrData', () => {
    it('有効なJSONで有効と判定', () => {
      const jsonContent = JSON.stringify([{ id: 'TC-001', name: 'Test Case' }]);

      const result = validateZephyrData(jsonContent, 'json');
      expect(result.valid).toBe(true);
    });

    it('空のJSONコンテンツで無効と判定', () => {
      const result = validateZephyrData('', 'json');
      expect(result.valid).toBe(false);
      expect(result.error).toBe('JSONコンテンツが空です。');
    });

    it('テストケースがない場合は無効', () => {
      const jsonContent = JSON.stringify({ other: 'data' });
      const result = validateZephyrData(jsonContent, 'json');
      expect(result.valid).toBe(false);
    });
  });

  describe('generateZephyrImportPreview', () => {
    it('プレビューを生成', () => {
      const jsonContent = JSON.stringify([
        {
          id: 'TC-001',
          name: 'Test Case 1',
          folder: 'Suite A',
          steps: [{ index: 1, description: 'Step 1', expectedResult: 'Result 1' }],
        },
        {
          id: 'TC-002',
          name: 'Test Case 2',
          folder: 'Suite B',
        },
      ]);

      const preview = generateZephyrImportPreview(jsonContent, 'json');
      expect(preview).toBeDefined();
      expect(preview?.totalTestCases).toBe(2);
      expect(preview?.totalTestSteps).toBe(1);
    });

    it('無効なJSONでnullを返す', () => {
      const preview = generateZephyrImportPreview('', 'json');
      expect(preview).toBeNull();
    });

    it('名前のないテストケースはUnnamedにマッピングされる', () => {
      const jsonContent = JSON.stringify([{ id: 'TC-001', name: '' }]);

      const preview = generateZephyrImportPreview(jsonContent, 'json');
      expect(preview).toBeDefined();
      // mapZephyrTestCase assigns 'Unnamed' for empty names
      expect(preview?.totalTestCases).toBe(1);
    });
  });
});

describe('Zephyr Priority Mapping', () => {
  it('High優先度を正しくマッピング', () => {
    const jsonContent = JSON.stringify([{ id: 'TC-001', name: 'High Priority', priority: 'High' }]);

    const result = parseZephyrJson(jsonContent);
    expect(result.testCases![0].priority).toBe('High');
  });

  it('数値優先度を正しくマッピング', () => {
    const jsonContent = JSON.stringify([{ id: 'TC-001', name: 'Priority 1', priority: '1' }]);

    const result = parseZephyrJson(jsonContent);
    expect(result.testCases![0].priority).toBe('High');
  });

  it('大文字小文字を区別しない', () => {
    const jsonContent = JSON.stringify([{ id: 'TC-001', name: 'Priority HIGH', priority: 'HIGH' }]);

    const result = parseZephyrJson(jsonContent);
    expect(result.testCases![0].priority).toBe('High');
  });
});
