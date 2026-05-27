/**
 * Version Management Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  ChangeType,
  SectionSnapshot,
  TestCaseSnapshot,
  TestStepSnapshot,
  getChangeTypeLabel,
  getChangeTypeColor,
  getFieldLabel,
  buildSectionTree,
  calculateComparisonSummary,
  diffTestCases,
  diffSections,
  validateVersionString,
  compareVersionStrings,
  SectionChange,
  TestCaseChange,
} from '../version-management';

describe('version-management types', () => {
  // ====================================
  // ChangeType Tests
  // ====================================

  describe('ChangeType', () => {
    it('should have all expected values', () => {
      expect(ChangeType.ADDED).toBe('ADDED');
      expect(ChangeType.REMOVED).toBe('REMOVED');
      expect(ChangeType.MODIFIED).toBe('MODIFIED');
      expect(ChangeType.UNCHANGED).toBe('UNCHANGED');
    });
  });

  // ====================================
  // getChangeTypeLabel Tests
  // ====================================

  describe('getChangeTypeLabel', () => {
    it('should return correct labels', () => {
      expect(getChangeTypeLabel(ChangeType.ADDED)).toBe('追加');
      expect(getChangeTypeLabel(ChangeType.REMOVED)).toBe('削除');
      expect(getChangeTypeLabel(ChangeType.MODIFIED)).toBe('変更');
      expect(getChangeTypeLabel(ChangeType.UNCHANGED)).toBe('変更なし');
    });

    it('should return the type itself for unknown types', () => {
      expect(getChangeTypeLabel('UNKNOWN' as ChangeType)).toBe('UNKNOWN');
    });
  });

  // ====================================
  // getChangeTypeColor Tests
  // ====================================

  describe('getChangeTypeColor', () => {
    it('should return correct colors', () => {
      expect(getChangeTypeColor(ChangeType.ADDED)).toContain('green');
      expect(getChangeTypeColor(ChangeType.REMOVED)).toContain('red');
      expect(getChangeTypeColor(ChangeType.MODIFIED)).toContain('yellow');
      expect(getChangeTypeColor(ChangeType.UNCHANGED)).toContain('gray');
    });

    it('should return empty string for unknown types', () => {
      expect(getChangeTypeColor('UNKNOWN' as ChangeType)).toBe('');
    });
  });

  // ====================================
  // getFieldLabel Tests
  // ====================================

  describe('getFieldLabel', () => {
    it('should return correct labels for known fields', () => {
      expect(getFieldLabel('title')).toBe('タイトル');
      expect(getFieldLabel('description')).toBe('説明');
      expect(getFieldLabel('preconditions')).toBe('前提条件');
      expect(getFieldLabel('steps')).toBe('テストステップ');
      expect(getFieldLabel('priority')).toBe('優先度');
      expect(getFieldLabel('status')).toBe('ステータス');
      expect(getFieldLabel('testType')).toBe('テストタイプ');
      expect(getFieldLabel('estimatedTime')).toBe('見積時間');
      expect(getFieldLabel('tags')).toBe('タグ');
    });

    it('should return the field name itself for unknown fields', () => {
      expect(getFieldLabel('unknownField')).toBe('unknownField');
    });
  });

  // ====================================
  // buildSectionTree Tests
  // ====================================

  describe('buildSectionTree', () => {
    it('should build tree from flat sections', () => {
      const sections: SectionSnapshot[] = [
        { id: '1', name: 'Section 1', sortOrder: 1 },
        { id: '2', name: 'Section 1.1', parentId: '1', sortOrder: 1 },
        { id: '3', name: 'Section 1.2', parentId: '1', sortOrder: 2 },
        { id: '4', name: 'Section 2', sortOrder: 2 },
      ];

      const tree = buildSectionTree(sections);

      expect(tree).toHaveLength(2);
      expect(tree[0].name).toBe('Section 1');
      expect(tree[0].children).toHaveLength(2);
      expect(tree[0].children[0].name).toBe('Section 1.1');
      expect(tree[0].children[1].name).toBe('Section 1.2');
      expect(tree[1].name).toBe('Section 2');
      expect(tree[1].children).toHaveLength(0);
    });

    it('should handle empty sections', () => {
      const tree = buildSectionTree([]);
      expect(tree).toHaveLength(0);
    });

    it('should sort by sortOrder', () => {
      const sections: SectionSnapshot[] = [
        { id: '1', name: 'Section C', sortOrder: 3 },
        { id: '2', name: 'Section A', sortOrder: 1 },
        { id: '3', name: 'Section B', sortOrder: 2 },
      ];

      const tree = buildSectionTree(sections);

      expect(tree[0].name).toBe('Section A');
      expect(tree[1].name).toBe('Section B');
      expect(tree[2].name).toBe('Section C');
    });
  });

  // ====================================
  // calculateComparisonSummary Tests
  // ====================================

  describe('calculateComparisonSummary', () => {
    it('should calculate correct summary', () => {
      const sectionChanges: SectionChange[] = [
        { sectionId: '1', sectionName: 'Added', changeType: ChangeType.ADDED },
        { sectionId: '2', sectionName: 'Removed', changeType: ChangeType.REMOVED },
        { sectionId: '3', sectionName: 'Modified', changeType: ChangeType.MODIFIED },
        { sectionId: '4', sectionName: 'Unchanged', changeType: ChangeType.UNCHANGED },
      ];

      const testCaseChanges: TestCaseChange[] = [
        { testCaseId: '1', testCaseTitle: 'Added', sectionId: '1', changeType: ChangeType.ADDED },
        { testCaseId: '2', testCaseTitle: 'Added2', sectionId: '1', changeType: ChangeType.ADDED },
        {
          testCaseId: '3',
          testCaseTitle: 'Removed',
          sectionId: '2',
          changeType: ChangeType.REMOVED,
        },
        {
          testCaseId: '4',
          testCaseTitle: 'Modified',
          sectionId: '3',
          changeType: ChangeType.MODIFIED,
        },
        {
          testCaseId: '5',
          testCaseTitle: 'Modified2',
          sectionId: '3',
          changeType: ChangeType.MODIFIED,
        },
        {
          testCaseId: '6',
          testCaseTitle: 'Unchanged',
          sectionId: '4',
          changeType: ChangeType.UNCHANGED,
        },
      ];

      const summary = calculateComparisonSummary(sectionChanges, testCaseChanges);

      expect(summary.sectionsAdded).toBe(1);
      expect(summary.sectionsRemoved).toBe(1);
      expect(summary.sectionsModified).toBe(1);
      expect(summary.sectionsUnchanged).toBe(1);
      expect(summary.testCasesAdded).toBe(2);
      expect(summary.testCasesRemoved).toBe(1);
      expect(summary.testCasesModified).toBe(2);
      expect(summary.testCasesUnchanged).toBe(1);
    });

    it('should handle empty arrays', () => {
      const summary = calculateComparisonSummary([], []);

      expect(summary.sectionsAdded).toBe(0);
      expect(summary.sectionsRemoved).toBe(0);
      expect(summary.sectionsModified).toBe(0);
      expect(summary.sectionsUnchanged).toBe(0);
      expect(summary.testCasesAdded).toBe(0);
      expect(summary.testCasesRemoved).toBe(0);
      expect(summary.testCasesModified).toBe(0);
      expect(summary.testCasesUnchanged).toBe(0);
    });
  });

  // ====================================
  // diffTestCases Tests
  // ====================================

  describe('diffTestCases', () => {
    const createTestCase = (overrides: Partial<TestCaseSnapshot> = {}): TestCaseSnapshot => ({
      id: '1',
      sectionId: 's1',
      title: 'Test Case',
      description: 'Description',
      preconditions: 'Pre',
      steps: [{ id: 'step1', stepNumber: 1, action: 'Do', expectedResult: 'Done' }],
      priority: 'HIGH',
      status: 'ACTIVE',
      testType: 'FUNCTIONAL',
      estimatedTime: 30,
      tags: ['tag1'],
      ...overrides,
    });

    it('should return empty array when both are identical', () => {
      const tc = createTestCase();
      const changes = diffTestCases(tc, { ...tc });
      expect(changes).toHaveLength(0);
    });

    it('should detect title change', () => {
      const prev = createTestCase({ title: 'Old Title' });
      const curr = createTestCase({ title: 'New Title' });
      const changes = diffTestCases(prev, curr);

      expect(changes).toHaveLength(1);
      expect(changes[0].fieldName).toBe('title');
      expect(changes[0].previousValue).toBe('Old Title');
      expect(changes[0].currentValue).toBe('New Title');
    });

    it('should detect description change', () => {
      const prev = createTestCase({ description: 'Old Desc' });
      const curr = createTestCase({ description: 'New Desc' });
      const changes = diffTestCases(prev, curr);

      expect(changes).toHaveLength(1);
      expect(changes[0].fieldName).toBe('description');
    });

    it('should detect tag changes', () => {
      const prev = createTestCase({ tags: ['tag1', 'tag2'] });
      const curr = createTestCase({ tags: ['tag1', 'tag3'] });
      const changes = diffTestCases(prev, curr);

      expect(changes.some((c) => c.fieldName === 'tags')).toBe(true);
    });

    it('should detect step changes', () => {
      const prev = createTestCase({
        steps: [{ id: 'step1', stepNumber: 1, action: 'Do', expectedResult: 'Done' }],
      });
      const curr = createTestCase({
        steps: [{ id: 'step1', stepNumber: 1, action: 'Do Something', expectedResult: 'Done' }],
      });
      const changes = diffTestCases(prev, curr);

      expect(changes.some((c) => c.fieldName === 'steps')).toBe(true);
    });

    it('should detect multiple changes', () => {
      const prev = createTestCase({
        title: 'Old',
        priority: 'LOW',
        estimatedTime: 10,
      });
      const curr = createTestCase({
        title: 'New',
        priority: 'HIGH',
        estimatedTime: 60,
      });
      const changes = diffTestCases(prev, curr);

      expect(changes).toHaveLength(3);
    });

    it('should return empty array when previous is undefined', () => {
      const changes = diffTestCases(undefined, createTestCase());
      expect(changes).toHaveLength(0);
    });

    it('should return empty array when current is undefined', () => {
      const changes = diffTestCases(createTestCase(), undefined);
      expect(changes).toHaveLength(0);
    });
  });

  // ====================================
  // diffSections Tests
  // ====================================

  describe('diffSections', () => {
    const createSection = (overrides: Partial<SectionSnapshot> = {}): SectionSnapshot => ({
      id: '1',
      name: 'Section',
      sortOrder: 1,
      ...overrides,
    });

    it('should return empty array when both are identical', () => {
      const section = createSection();
      const changes = diffSections(section, { ...section });
      expect(changes).toHaveLength(0);
    });

    it('should detect name change', () => {
      const prev = createSection({ name: 'Old Name' });
      const curr = createSection({ name: 'New Name' });
      const changes = diffSections(prev, curr);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toContain('名前');
      expect(changes[0]).toContain('Old Name');
      expect(changes[0]).toContain('New Name');
    });

    it('should detect parent change', () => {
      const prev = createSection({ parentId: 'parent1' });
      const curr = createSection({ parentId: 'parent2' });
      const changes = diffSections(prev, curr);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toBe('親セクション変更');
    });

    it('should detect sort order change', () => {
      const prev = createSection({ sortOrder: 1 });
      const curr = createSection({ sortOrder: 5 });
      const changes = diffSections(prev, curr);

      expect(changes).toHaveLength(1);
      expect(changes[0]).toContain('表示順');
    });

    it('should return empty array when previous is undefined', () => {
      const changes = diffSections(undefined, createSection());
      expect(changes).toHaveLength(0);
    });

    it('should return empty array when current is undefined', () => {
      const changes = diffSections(createSection(), undefined);
      expect(changes).toHaveLength(0);
    });
  });

  // ====================================
  // validateVersionString Tests
  // ====================================

  describe('validateVersionString', () => {
    it('should validate semantic version', () => {
      expect(validateVersionString('1.0.0').valid).toBe(true);
      expect(validateVersionString('1.0').valid).toBe(true);
      expect(validateVersionString('1.2.3').valid).toBe(true);
      expect(validateVersionString('10.20.30').valid).toBe(true);
    });

    it('should validate versions with v prefix', () => {
      expect(validateVersionString('v1.0.0').valid).toBe(true);
      expect(validateVersionString('V1.0').valid).toBe(true);
      expect(validateVersionString('v1').valid).toBe(true);
    });

    it('should validate versions with prerelease tags', () => {
      expect(validateVersionString('1.0.0-beta').valid).toBe(true);
      expect(validateVersionString('v1.0.0-rc1').valid).toBe(true);
      expect(validateVersionString('1.0.0-alpha').valid).toBe(true);
    });

    it('should reject empty version', () => {
      expect(validateVersionString('').valid).toBe(false);
      expect(validateVersionString('   ').valid).toBe(false);
    });

    it('should reject invalid formats', () => {
      expect(validateVersionString('abc').valid).toBe(false);
      expect(validateVersionString('1.a.0').valid).toBe(false);
      expect(validateVersionString('version-1').valid).toBe(false);
    });
  });

  // ====================================
  // compareVersionStrings Tests
  // ====================================

  describe('compareVersionStrings', () => {
    it('should compare simple versions', () => {
      expect(compareVersionStrings('1.0.0', '1.0.0')).toBe(0);
      expect(compareVersionStrings('2.0.0', '1.0.0')).toBe(1);
      expect(compareVersionStrings('1.0.0', '2.0.0')).toBe(-1);
    });

    it('should compare minor versions', () => {
      expect(compareVersionStrings('1.1.0', '1.0.0')).toBe(1);
      expect(compareVersionStrings('1.0.0', '1.1.0')).toBe(-1);
    });

    it('should compare patch versions', () => {
      expect(compareVersionStrings('1.0.1', '1.0.0')).toBe(1);
      expect(compareVersionStrings('1.0.0', '1.0.1')).toBe(-1);
    });

    it('should handle v prefix', () => {
      expect(compareVersionStrings('v1.0.0', '1.0.0')).toBe(0);
      expect(compareVersionStrings('V2.0.0', 'v1.0.0')).toBe(1);
    });

    it('should handle different length versions', () => {
      expect(compareVersionStrings('1.0', '1.0.0')).toBe(0);
      expect(compareVersionStrings('1.0.1', '1.0')).toBe(1);
    });

    it('should compare prerelease versions', () => {
      expect(compareVersionStrings('1.0.0-alpha', '1.0.0-beta')).toBe(-1);
      expect(compareVersionStrings('1.0.0-beta', '1.0.0-alpha')).toBe(1);
      expect(compareVersionStrings('1.0.0-rc1', '1.0.0-rc2')).toBe(-1);
    });
  });
});
