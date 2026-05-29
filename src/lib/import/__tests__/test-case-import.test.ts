import { describe, it, expect } from 'vitest';
import {
  autoDetectMapping,
  validateMapping,
  convertCsvToTestCases,
  detectStepColumns,
  extractSteps,
  generateImportSummary,
  PRIORITY_MAPPING,
  TEST_TYPE_MAPPING,
  TEST_TECHNIQUE_MAPPING,
  DEFAULT_FIELD_MAPPING,
  TARGET_FIELDS,
  REQUIRED_FIELDS,
} from '../test-case-import';
import type { FieldMapping } from '../test-case-import';
import { parseCsv } from '../csv-parser';

describe('test-case-import', () => {
  describe('autoDetectMapping', () => {
    it('should detect Japanese header mappings', () => {
      const headers = ['タイトル', '説明', '優先度'];
      const mappings = autoDetectMapping(headers);

      expect(mappings).toContainEqual({ csvHeader: 'タイトル', targetField: 'title' });
      expect(mappings).toContainEqual({ csvHeader: '説明', targetField: 'description' });
      expect(mappings).toContainEqual({ csvHeader: '優先度', targetField: 'priority' });
    });

    it('should detect English header mappings', () => {
      const headers = ['title', 'description', 'priority'];
      const mappings = autoDetectMapping(headers);

      expect(mappings).toContainEqual({ csvHeader: 'title', targetField: 'title' });
      expect(mappings).toContainEqual({ csvHeader: 'description', targetField: 'description' });
      expect(mappings).toContainEqual({ csvHeader: 'priority', targetField: 'priority' });
    });

    it('should detect mixed case header mappings', () => {
      const headers = ['Title', 'Description', 'Priority'];
      const mappings = autoDetectMapping(headers);

      expect(mappings).toContainEqual({ csvHeader: 'Title', targetField: 'title' });
      expect(mappings).toContainEqual({ csvHeader: 'Description', targetField: 'description' });
      expect(mappings).toContainEqual({ csvHeader: 'Priority', targetField: 'priority' });
    });

    it('should ignore unknown headers', () => {
      const headers = ['タイトル', 'カスタムフィールド', '不明'];
      const mappings = autoDetectMapping(headers);

      expect(mappings).toHaveLength(1);
      expect(mappings[0]).toEqual({ csvHeader: 'タイトル', targetField: 'title' });
    });

    it('should handle empty headers', () => {
      const mappings = autoDetectMapping([]);
      expect(mappings).toHaveLength(0);
    });
  });

  describe('validateMapping', () => {
    it('should validate correct mapping', () => {
      const mappings: FieldMapping[] = [
        { csvHeader: 'タイトル', targetField: 'title' },
        { csvHeader: '説明', targetField: 'description' },
      ];

      const result = validateMapping(mappings);

      expect(result.valid).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should report missing required fields', () => {
      const mappings: FieldMapping[] = [{ csvHeader: '説明', targetField: 'description' }];

      const result = validateMapping(mappings);

      expect(result.valid).toBe(false);
      expect(result.errors).toContain('必須フィールド「title」がマッピングされていません。');
    });

    it('should report duplicate field mappings', () => {
      const mappings: FieldMapping[] = [
        { csvHeader: 'タイトル1', targetField: 'title' },
        { csvHeader: 'タイトル2', targetField: 'title' },
      ];

      const result = validateMapping(mappings);

      expect(result.valid).toBe(false);
      expect(result.errors.some((e) => e.includes('重複'))).toBe(true);
    });
  });

  describe('convertCsvToTestCases', () => {
    it('should convert valid CSV to test cases', () => {
      const csv = 'タイトル,説明,優先度\nテスト1,説明1,高\nテスト2,説明2,中';
      const parseResult = parseCsv(csv);
      const mappings: FieldMapping[] = [
        { csvHeader: 'タイトル', targetField: 'title' },
        { csvHeader: '説明', targetField: 'description' },
        { csvHeader: '優先度', targetField: 'priority' },
      ];

      const results = convertCsvToTestCases(parseResult, mappings);

      expect(results).toHaveLength(2);
      expect(results[0].valid).toBe(true);
      expect(results[0].data?.title).toBe('テスト1');
      expect(results[0].data?.description).toBe('説明1');
      expect(results[0].data?.priority).toBe('HIGH');
      expect(results[1].valid).toBe(true);
      expect(results[1].data?.priority).toBe('MEDIUM');
    });

    it('should report error for missing title', () => {
      const csv = 'タイトル,説明\n,説明1';
      const parseResult = parseCsv(csv);
      const mappings: FieldMapping[] = [
        { csvHeader: 'タイトル', targetField: 'title' },
        { csvHeader: '説明', targetField: 'description' },
      ];

      const results = convertCsvToTestCases(parseResult, mappings);

      expect(results[0].valid).toBe(false);
      expect(results[0].errors.some((e) => e.field === 'title')).toBe(true);
    });

    it('should report error for invalid priority', () => {
      const csv = 'タイトル,優先度\nテスト1,無効な優先度';
      const parseResult = parseCsv(csv);
      const mappings: FieldMapping[] = [
        { csvHeader: 'タイトル', targetField: 'title' },
        { csvHeader: '優先度', targetField: 'priority' },
      ];

      const results = convertCsvToTestCases(parseResult, mappings);

      expect(results[0].valid).toBe(false);
      expect(results[0].errors.some((e) => e.field === 'priority')).toBe(true);
    });

    it('should parse tags from comma-separated values', () => {
      const csv = 'タイトル,タグ\nテスト1,"tag1, tag2, tag3"';
      const parseResult = parseCsv(csv);
      const mappings: FieldMapping[] = [
        { csvHeader: 'タイトル', targetField: 'title' },
        { csvHeader: 'タグ', targetField: 'tags' },
      ];

      const results = convertCsvToTestCases(parseResult, mappings);

      expect(results[0].valid).toBe(true);
      expect(results[0].data?.tags).toEqual(['tag1', 'tag2', 'tag3']);
    });

    it('should parse estimated time as number', () => {
      const csv = 'タイトル,見積時間(分)\nテスト1,30';
      const parseResult = parseCsv(csv);
      const mappings: FieldMapping[] = [
        { csvHeader: 'タイトル', targetField: 'title' },
        { csvHeader: '見積時間(分)', targetField: 'estimatedTime' },
      ];

      const results = convertCsvToTestCases(parseResult, mappings);

      expect(results[0].valid).toBe(true);
      expect(results[0].data?.estimatedTime).toBe(30);
    });

    it('should report error for invalid estimated time', () => {
      const csv = 'タイトル,見積時間(分)\nテスト1,invalid';
      const parseResult = parseCsv(csv);
      const mappings: FieldMapping[] = [
        { csvHeader: 'タイトル', targetField: 'title' },
        { csvHeader: '見積時間(分)', targetField: 'estimatedTime' },
      ];

      const results = convertCsvToTestCases(parseResult, mappings);

      expect(results[0].valid).toBe(false);
      expect(results[0].errors.some((e) => e.field === 'estimatedTime')).toBe(true);
    });

    it('should include row number in results', () => {
      const csv = 'タイトル\nテスト1\nテスト2';
      const parseResult = parseCsv(csv);
      const mappings: FieldMapping[] = [{ csvHeader: 'タイトル', targetField: 'title' }];

      const results = convertCsvToTestCases(parseResult, mappings);

      expect(results[0].row).toBe(2); // Header is row 1
      expect(results[1].row).toBe(3);
    });
  });

  describe('detectStepColumns', () => {
    it('should detect Japanese step columns', () => {
      const headers = ['タイトル', '手順1_操作', '手順1_期待結果', '手順2_操作', '手順2_期待結果'];
      const result = detectStepColumns(headers);

      expect(result.maxSteps).toBe(2);
      expect(result.stepMappings).toHaveLength(2);
      expect(result.stepMappings[0]).toEqual({
        stepNo: 1,
        actionHeader: '手順1_操作',
        expectedHeader: '手順1_期待結果',
      });
      expect(result.stepMappings[1]).toEqual({
        stepNo: 2,
        actionHeader: '手順2_操作',
        expectedHeader: '手順2_期待結果',
      });
    });

    it('should detect English step columns', () => {
      const headers = ['title', 'step1_action', 'step1_expected', 'step2_action'];
      const result = detectStepColumns(headers);

      expect(result.maxSteps).toBe(2);
      expect(result.stepMappings).toHaveLength(2);
      expect(result.stepMappings[0].actionHeader).toBe('step1_action');
      expect(result.stepMappings[0].expectedHeader).toBe('step1_expected');
      expect(result.stepMappings[1].actionHeader).toBe('step2_action');
      expect(result.stepMappings[1].expectedHeader).toBeUndefined();
    });

    it('should handle action-only columns', () => {
      const headers = ['タイトル', '手順1_操作', '手順2_操作'];
      const result = detectStepColumns(headers);

      expect(result.maxSteps).toBe(2);
      expect(result.stepMappings[0].expectedHeader).toBeUndefined();
      expect(result.stepMappings[1].expectedHeader).toBeUndefined();
    });

    it('should return empty for no step columns', () => {
      const headers = ['タイトル', '説明'];
      const result = detectStepColumns(headers);

      expect(result.maxSteps).toBe(0);
      expect(result.stepMappings).toHaveLength(0);
    });

    it('should sort step mappings by step number', () => {
      const headers = ['手順3_操作', '手順1_操作', '手順2_操作'];
      const result = detectStepColumns(headers);

      expect(result.stepMappings[0].stepNo).toBe(1);
      expect(result.stepMappings[1].stepNo).toBe(2);
      expect(result.stepMappings[2].stepNo).toBe(3);
    });
  });

  describe('extractSteps', () => {
    it('should extract steps from row', () => {
      const row = {
        タイトル: 'テスト',
        手順1_操作: 'アクション1',
        手順1_期待結果: '結果1',
        手順2_操作: 'アクション2',
        手順2_期待結果: '結果2',
      };
      const stepMappings = [
        { stepNo: 1, actionHeader: '手順1_操作', expectedHeader: '手順1_期待結果' },
        { stepNo: 2, actionHeader: '手順2_操作', expectedHeader: '手順2_期待結果' },
      ];

      const steps = extractSteps(row, stepMappings);

      expect(steps).toHaveLength(2);
      expect(steps[0]).toEqual({ stepNo: 1, action: 'アクション1', expected: '結果1' });
      expect(steps[1]).toEqual({ stepNo: 2, action: 'アクション2', expected: '結果2' });
    });

    it('should skip empty action steps', () => {
      const row = {
        手順1_操作: 'アクション1',
        手順1_期待結果: '結果1',
        手順2_操作: '',
        手順2_期待結果: '結果2',
      };
      const stepMappings = [
        { stepNo: 1, actionHeader: '手順1_操作', expectedHeader: '手順1_期待結果' },
        { stepNo: 2, actionHeader: '手順2_操作', expectedHeader: '手順2_期待結果' },
      ];

      const steps = extractSteps(row, stepMappings);

      expect(steps).toHaveLength(1);
      expect(steps[0].stepNo).toBe(1);
    });

    it('should handle missing expected result', () => {
      const row = {
        手順1_操作: 'アクション1',
      };
      const stepMappings = [{ stepNo: 1, actionHeader: '手順1_操作' }];

      const steps = extractSteps(row, stepMappings);

      expect(steps[0].expected).toBeUndefined();
    });
  });

  describe('generateImportSummary', () => {
    it('should generate correct summary', () => {
      const results = [
        { valid: true, row: 2, errors: [], data: { title: 'Test 1' } },
        { valid: false, row: 3, errors: [{ field: 'title', message: 'Required' }] },
        { valid: true, row: 4, errors: [], data: { title: 'Test 2' } },
      ];

      const summary = generateImportSummary(results as never[]);

      expect(summary.valid).toBe(2);
      expect(summary.invalid).toBe(1);
      expect(summary.total).toBe(3);
    });

    it('should handle all valid', () => {
      const results = [
        { valid: true, row: 2, errors: [], data: { title: 'Test 1' } },
        { valid: true, row: 3, errors: [], data: { title: 'Test 2' } },
      ];

      const summary = generateImportSummary(results as never[]);

      expect(summary.valid).toBe(2);
      expect(summary.invalid).toBe(0);
    });

    it('should handle all invalid', () => {
      const results = [
        { valid: false, row: 2, errors: [{ field: 'title', message: 'Required' }] },
        { valid: false, row: 3, errors: [{ field: 'title', message: 'Required' }] },
      ];

      const summary = generateImportSummary(results as never[]);

      expect(summary.valid).toBe(0);
      expect(summary.invalid).toBe(2);
    });
  });

  describe('PRIORITY_MAPPING', () => {
    it('should map Japanese priority values', () => {
      expect(PRIORITY_MAPPING['最重要']).toBe('CRITICAL');
      expect(PRIORITY_MAPPING['高']).toBe('HIGH');
      expect(PRIORITY_MAPPING['中']).toBe('MEDIUM');
      expect(PRIORITY_MAPPING['低']).toBe('LOW');
    });

    it('should map English priority values', () => {
      expect(PRIORITY_MAPPING['critical']).toBe('CRITICAL');
      expect(PRIORITY_MAPPING['high']).toBe('HIGH');
      expect(PRIORITY_MAPPING['medium']).toBe('MEDIUM');
      expect(PRIORITY_MAPPING['low']).toBe('LOW');
    });

    it('should map uppercase priority values', () => {
      expect(PRIORITY_MAPPING['CRITICAL']).toBe('CRITICAL');
      expect(PRIORITY_MAPPING['HIGH']).toBe('HIGH');
      expect(PRIORITY_MAPPING['MEDIUM']).toBe('MEDIUM');
      expect(PRIORITY_MAPPING['LOW']).toBe('LOW');
    });
  });

  describe('TEST_TYPE_MAPPING', () => {
    it('should map Japanese test type values', () => {
      expect(TEST_TYPE_MAPPING['機能テスト']).toBe('FUNCTIONAL');
      expect(TEST_TYPE_MAPPING['性能テスト']).toBe('PERFORMANCE');
      expect(TEST_TYPE_MAPPING['セキュリティテスト']).toBe('SECURITY');
    });

    it('should map English test type values', () => {
      expect(TEST_TYPE_MAPPING['functional']).toBe('FUNCTIONAL');
      expect(TEST_TYPE_MAPPING['performance']).toBe('PERFORMANCE');
      expect(TEST_TYPE_MAPPING['security']).toBe('SECURITY');
    });
  });

  describe('TEST_TECHNIQUE_MAPPING', () => {
    it('should map Japanese test technique values', () => {
      expect(TEST_TECHNIQUE_MAPPING['同値分割']).toBe('EQUIVALENCE_PARTITIONING');
      expect(TEST_TECHNIQUE_MAPPING['境界値分析']).toBe('BOUNDARY_VALUE_ANALYSIS');
      expect(TEST_TECHNIQUE_MAPPING['デシジョンテーブル']).toBe('DECISION_TABLE');
    });

    it('should map English test technique values', () => {
      expect(TEST_TECHNIQUE_MAPPING['equivalence']).toBe('EQUIVALENCE_PARTITIONING');
      expect(TEST_TECHNIQUE_MAPPING['boundary']).toBe('BOUNDARY_VALUE_ANALYSIS');
      expect(TEST_TECHNIQUE_MAPPING['decision_table']).toBe('DECISION_TABLE');
    });
  });

  describe('DEFAULT_FIELD_MAPPING', () => {
    it('should have mappings for all target fields', () => {
      // Check that each target field has at least one mapping
      const mappedFields = new Set(Object.values(DEFAULT_FIELD_MAPPING));

      for (const field of TARGET_FIELDS) {
        expect(mappedFields.has(field.key)).toBe(true);
      }
    });
  });

  describe('TARGET_FIELDS', () => {
    it('should have title as required', () => {
      const titleField = TARGET_FIELDS.find((f) => f.key === 'title');
      expect(titleField?.required).toBe(true);
    });

    it('should have description as optional', () => {
      const descField = TARGET_FIELDS.find((f) => f.key === 'description');
      expect(descField?.required).toBe(false);
    });
  });

  describe('REQUIRED_FIELDS', () => {
    it('should contain title', () => {
      expect(REQUIRED_FIELDS).toContain('title');
    });
  });
});
