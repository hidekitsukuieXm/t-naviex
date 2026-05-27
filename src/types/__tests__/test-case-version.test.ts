/**
 * Test Case Version Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  StepChangeType,
  getTestCaseFieldLabel,
  getStepChangeTypeLabel,
  getStepChangeTypeColor,
  createTestCaseSnapshot,
  diffTestCaseVersions,
  calculateVersionComparisonSummary,
  TestCaseVersionContent,
  TestStepSnapshot,
} from '../test-case-version';

describe('test-case-version types', () => {
  // ====================================
  // StepChangeType Tests
  // ====================================

  describe('StepChangeType', () => {
    it('should have all expected values', () => {
      expect(StepChangeType.ADDED).toBe('ADDED');
      expect(StepChangeType.REMOVED).toBe('REMOVED');
      expect(StepChangeType.MODIFIED).toBe('MODIFIED');
      expect(StepChangeType.UNCHANGED).toBe('UNCHANGED');
    });
  });

  // ====================================
  // getTestCaseFieldLabel Tests
  // ====================================

  describe('getTestCaseFieldLabel', () => {
    it('should return correct labels for known fields', () => {
      expect(getTestCaseFieldLabel('title')).toBe('タイトル');
      expect(getTestCaseFieldLabel('description')).toBe('説明');
      expect(getTestCaseFieldLabel('preconditions')).toBe('前提条件');
      expect(getTestCaseFieldLabel('expectedResult')).toBe('期待結果');
      expect(getTestCaseFieldLabel('checkpoint')).toBe('チェックポイント');
      expect(getTestCaseFieldLabel('scenario')).toBe('シナリオ');
      expect(getTestCaseFieldLabel('testEnvironment')).toBe('テスト環境');
      expect(getTestCaseFieldLabel('notes')).toBe('備考');
      expect(getTestCaseFieldLabel('priority')).toBe('優先度');
      expect(getTestCaseFieldLabel('testType')).toBe('テストタイプ');
      expect(getTestCaseFieldLabel('testTechnique')).toBe('テスト技法');
      expect(getTestCaseFieldLabel('estimatedTime')).toBe('見積時間');
      expect(getTestCaseFieldLabel('tags')).toBe('タグ');
      expect(getTestCaseFieldLabel('steps')).toBe('テストステップ');
    });

    it('should return field name for unknown fields', () => {
      expect(getTestCaseFieldLabel('unknownField')).toBe('unknownField');
    });
  });

  // ====================================
  // getStepChangeTypeLabel Tests
  // ====================================

  describe('getStepChangeTypeLabel', () => {
    it('should return correct labels', () => {
      expect(getStepChangeTypeLabel(StepChangeType.ADDED)).toBe('追加');
      expect(getStepChangeTypeLabel(StepChangeType.REMOVED)).toBe('削除');
      expect(getStepChangeTypeLabel(StepChangeType.MODIFIED)).toBe('変更');
      expect(getStepChangeTypeLabel(StepChangeType.UNCHANGED)).toBe('変更なし');
    });

    it('should return type itself for unknown types', () => {
      expect(getStepChangeTypeLabel('UNKNOWN' as StepChangeType)).toBe('UNKNOWN');
    });
  });

  // ====================================
  // getStepChangeTypeColor Tests
  // ====================================

  describe('getStepChangeTypeColor', () => {
    it('should return correct colors', () => {
      expect(getStepChangeTypeColor(StepChangeType.ADDED)).toContain('green');
      expect(getStepChangeTypeColor(StepChangeType.REMOVED)).toContain('red');
      expect(getStepChangeTypeColor(StepChangeType.MODIFIED)).toContain('yellow');
      expect(getStepChangeTypeColor(StepChangeType.UNCHANGED)).toContain('gray');
    });

    it('should return empty string for unknown types', () => {
      expect(getStepChangeTypeColor('UNKNOWN' as StepChangeType)).toBe('');
    });
  });

  // ====================================
  // createTestCaseSnapshot Tests
  // ====================================

  describe('createTestCaseSnapshot', () => {
    it('should create snapshot from test case data', () => {
      const testCase = {
        title: 'Test Case 1',
        description: 'Description',
        preconditions: 'Preconditions',
        priority: 'HIGH',
        testType: 'FUNCTIONAL',
        testTechnique: 'BOUNDARY_VALUE',
        estimatedTime: 30,
        steps: [
          { id: '1', stepNumber: 1, action: 'Step 1', expectedResult: 'Result 1' },
          { id: '2', stepNumber: 2, action: 'Step 2', expectedResult: 'Result 2' },
        ],
      };

      const snapshot = createTestCaseSnapshot(testCase);

      expect(snapshot.title).toBe('Test Case 1');
      expect(snapshot.description).toBe('Description');
      expect(snapshot.preconditions).toBe('Preconditions');
      expect(snapshot.priority).toBe('HIGH');
      expect(snapshot.testType).toBe('FUNCTIONAL');
      expect(snapshot.testTechnique).toBe('BOUNDARY_VALUE');
      expect(snapshot.estimatedTime).toBe(30);
      expect(snapshot.steps).toHaveLength(2);
      expect(snapshot.steps[0].action).toBe('Step 1');
    });

    it('should handle null values', () => {
      const testCase = {
        title: 'Test Case',
        description: null,
        preconditions: null,
        expectedResult: null,
        steps: [],
      };

      const snapshot = createTestCaseSnapshot(testCase);

      expect(snapshot.title).toBe('Test Case');
      expect(snapshot.description).toBeUndefined();
      expect(snapshot.preconditions).toBeUndefined();
      expect(snapshot.expectedResult).toBeUndefined();
      expect(snapshot.steps).toHaveLength(0);
    });

    it('should handle tags as objects with tag.name', () => {
      const testCase = {
        title: 'Test Case',
        tags: [{ tag: { name: 'tag1' } }, { tag: { name: 'tag2' } }],
        steps: [],
      };

      const snapshot = createTestCaseSnapshot(testCase);

      expect(snapshot.tags).toEqual(['tag1', 'tag2']);
    });

    it('should handle tags as strings', () => {
      const testCase = {
        title: 'Test Case',
        tags: ['tag1', 'tag2'],
        steps: [],
      };

      const snapshot = createTestCaseSnapshot(testCase);

      expect(snapshot.tags).toEqual(['tag1', 'tag2']);
    });

    it('should handle BigInt ids in steps', () => {
      const testCase = {
        title: 'Test Case',
        steps: [{ id: BigInt(123), stepNumber: 1, action: 'Action', expectedResult: 'Result' }],
      };

      const snapshot = createTestCaseSnapshot(testCase);

      expect(snapshot.steps[0].id).toBe('123');
    });
  });

  // ====================================
  // diffTestCaseVersions Tests
  // ====================================

  describe('diffTestCaseVersions', () => {
    const createContent = (
      overrides: Partial<TestCaseVersionContent> = {}
    ): TestCaseVersionContent => ({
      title: 'Test Case',
      description: 'Description',
      preconditions: 'Pre',
      priority: 'HIGH',
      testType: 'FUNCTIONAL',
      testTechnique: 'BOUNDARY_VALUE',
      estimatedTime: 30,
      tags: ['tag1'],
      steps: [{ id: 'step1', stepNumber: 1, action: 'Do', expectedResult: 'Done' }],
      ...overrides,
    });

    it('should return empty arrays when both are undefined', () => {
      const { fieldChanges, stepChanges } = diffTestCaseVersions(undefined, undefined);
      expect(fieldChanges).toHaveLength(0);
      expect(stepChanges).toHaveLength(0);
    });

    it('should return empty arrays when previous is undefined', () => {
      const { fieldChanges, stepChanges } = diffTestCaseVersions(undefined, createContent());
      expect(fieldChanges).toHaveLength(0);
      expect(stepChanges).toHaveLength(0);
    });

    it('should return empty arrays when current is undefined', () => {
      const { fieldChanges, stepChanges } = diffTestCaseVersions(createContent(), undefined);
      expect(fieldChanges).toHaveLength(0);
      expect(stepChanges).toHaveLength(0);
    });

    it('should detect no changes when both are identical', () => {
      const content = createContent();
      const { fieldChanges, stepChanges } = diffTestCaseVersions(content, { ...content });
      expect(fieldChanges).toHaveLength(0);
      expect(stepChanges.every((c) => c.changeType === StepChangeType.UNCHANGED)).toBe(true);
    });

    it('should detect title change', () => {
      const prev = createContent({ title: 'Old Title' });
      const curr = createContent({ title: 'New Title' });
      const { fieldChanges } = diffTestCaseVersions(prev, curr);

      expect(fieldChanges).toHaveLength(1);
      expect(fieldChanges[0].fieldName).toBe('title');
      expect(fieldChanges[0].previousValue).toBe('Old Title');
      expect(fieldChanges[0].currentValue).toBe('New Title');
    });

    it('should detect description change', () => {
      const prev = createContent({ description: 'Old Desc' });
      const curr = createContent({ description: 'New Desc' });
      const { fieldChanges } = diffTestCaseVersions(prev, curr);

      expect(fieldChanges).toHaveLength(1);
      expect(fieldChanges[0].fieldName).toBe('description');
    });

    it('should detect priority change', () => {
      const prev = createContent({ priority: 'LOW' });
      const curr = createContent({ priority: 'HIGH' });
      const { fieldChanges } = diffTestCaseVersions(prev, curr);

      expect(fieldChanges.some((c) => c.fieldName === 'priority')).toBe(true);
    });

    it('should detect tag changes', () => {
      const prev = createContent({ tags: ['tag1', 'tag2'] });
      const curr = createContent({ tags: ['tag1', 'tag3'] });
      const { fieldChanges } = diffTestCaseVersions(prev, curr);

      expect(fieldChanges.some((c) => c.fieldName === 'tags')).toBe(true);
    });

    it('should detect added step', () => {
      const prev = createContent({
        steps: [{ id: 'step1', stepNumber: 1, action: 'Do', expectedResult: 'Done' }],
      });
      const curr = createContent({
        steps: [
          { id: 'step1', stepNumber: 1, action: 'Do', expectedResult: 'Done' },
          { id: 'step2', stepNumber: 2, action: 'Do More', expectedResult: 'Done More' },
        ],
      });
      const { stepChanges } = diffTestCaseVersions(prev, curr);

      expect(stepChanges.some((c) => c.changeType === StepChangeType.ADDED)).toBe(true);
    });

    it('should detect removed step', () => {
      const prev = createContent({
        steps: [
          { id: 'step1', stepNumber: 1, action: 'Do', expectedResult: 'Done' },
          { id: 'step2', stepNumber: 2, action: 'Do More', expectedResult: 'Done More' },
        ],
      });
      const curr = createContent({
        steps: [{ id: 'step1', stepNumber: 1, action: 'Do', expectedResult: 'Done' }],
      });
      const { stepChanges } = diffTestCaseVersions(prev, curr);

      expect(stepChanges.some((c) => c.changeType === StepChangeType.REMOVED)).toBe(true);
    });

    it('should detect modified step', () => {
      const prev = createContent({
        steps: [{ id: 'step1', stepNumber: 1, action: 'Do', expectedResult: 'Done' }],
      });
      const curr = createContent({
        steps: [{ id: 'step1', stepNumber: 1, action: 'Do Something', expectedResult: 'Done' }],
      });
      const { stepChanges } = diffTestCaseVersions(prev, curr);

      expect(stepChanges.some((c) => c.changeType === StepChangeType.MODIFIED)).toBe(true);
      const modifiedStep = stepChanges.find((c) => c.changeType === StepChangeType.MODIFIED);
      expect(modifiedStep?.fieldChanges?.some((f) => f.field === 'action')).toBe(true);
    });

    it('should detect multiple changes', () => {
      const prev = createContent({
        title: 'Old',
        priority: 'LOW',
        estimatedTime: 10,
      });
      const curr = createContent({
        title: 'New',
        priority: 'HIGH',
        estimatedTime: 60,
      });
      const { fieldChanges } = diffTestCaseVersions(prev, curr);

      expect(fieldChanges).toHaveLength(3);
    });
  });

  // ====================================
  // calculateVersionComparisonSummary Tests
  // ====================================

  describe('calculateVersionComparisonSummary', () => {
    it('should calculate correct summary', () => {
      const fieldChanges = [
        { fieldName: 'title', fieldLabel: 'タイトル', previousValue: 'Old', currentValue: 'New' },
        { fieldName: 'description', fieldLabel: '説明', previousValue: 'Old', currentValue: 'New' },
      ];

      const stepChanges = [
        { stepNumber: 1, changeType: StepChangeType.ADDED as const },
        { stepNumber: 2, changeType: StepChangeType.REMOVED as const },
        { stepNumber: 3, changeType: StepChangeType.MODIFIED as const },
        { stepNumber: 4, changeType: StepChangeType.UNCHANGED as const },
        { stepNumber: 5, changeType: StepChangeType.UNCHANGED as const },
      ];

      const summary = calculateVersionComparisonSummary(fieldChanges, stepChanges);

      expect(summary.fieldsChanged).toBe(2);
      expect(summary.stepsAdded).toBe(1);
      expect(summary.stepsRemoved).toBe(1);
      expect(summary.stepsModified).toBe(1);
      expect(summary.stepsUnchanged).toBe(2);
      expect(summary.hasChanges).toBe(true);
    });

    it('should detect no changes', () => {
      const summary = calculateVersionComparisonSummary(
        [],
        [{ stepNumber: 1, changeType: StepChangeType.UNCHANGED }]
      );

      expect(summary.fieldsChanged).toBe(0);
      expect(summary.hasChanges).toBe(false);
    });

    it('should handle empty arrays', () => {
      const summary = calculateVersionComparisonSummary([], []);

      expect(summary.fieldsChanged).toBe(0);
      expect(summary.stepsAdded).toBe(0);
      expect(summary.stepsRemoved).toBe(0);
      expect(summary.stepsModified).toBe(0);
      expect(summary.stepsUnchanged).toBe(0);
      expect(summary.hasChanges).toBe(false);
    });

    it('should detect changes when only fields changed', () => {
      const summary = calculateVersionComparisonSummary(
        [{ fieldName: 'title', fieldLabel: 'タイトル', previousValue: 'Old', currentValue: 'New' }],
        []
      );

      expect(summary.hasChanges).toBe(true);
    });

    it('should detect changes when only steps changed', () => {
      const summary = calculateVersionComparisonSummary(
        [],
        [{ stepNumber: 1, changeType: StepChangeType.ADDED }]
      );

      expect(summary.hasChanges).toBe(true);
    });
  });
});
