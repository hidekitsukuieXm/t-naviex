/**
 * Edit History Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  EditOperationType,
  DiffType,
  getOperationTypeLabel,
  getOperationTypeColor,
  getDiffTypeLabel,
  getDiffTypeColor,
  getFieldLabel,
  valueToString,
  computeLineDiff,
  computeFieldDiff,
  generateEditSummary,
  formatEditDate,
  getRelativeTime,
  FieldChange,
} from '../edit-history';

describe('edit-history types', () => {
  // ====================================
  // EditOperationType Tests
  // ====================================

  describe('EditOperationType', () => {
    it('should have all expected values', () => {
      expect(EditOperationType.CREATE).toBe('CREATE');
      expect(EditOperationType.UPDATE).toBe('UPDATE');
      expect(EditOperationType.DELETE).toBe('DELETE');
      expect(EditOperationType.RESTORE).toBe('RESTORE');
    });
  });

  // ====================================
  // DiffType Tests
  // ====================================

  describe('DiffType', () => {
    it('should have all expected values', () => {
      expect(DiffType.ADDED).toBe('ADDED');
      expect(DiffType.REMOVED).toBe('REMOVED');
      expect(DiffType.MODIFIED).toBe('MODIFIED');
      expect(DiffType.UNCHANGED).toBe('UNCHANGED');
    });
  });

  // ====================================
  // getOperationTypeLabel Tests
  // ====================================

  describe('getOperationTypeLabel', () => {
    it('should return correct labels', () => {
      expect(getOperationTypeLabel(EditOperationType.CREATE)).toBe('作成');
      expect(getOperationTypeLabel(EditOperationType.UPDATE)).toBe('更新');
      expect(getOperationTypeLabel(EditOperationType.DELETE)).toBe('削除');
      expect(getOperationTypeLabel(EditOperationType.RESTORE)).toBe('復元');
    });

    it('should return type itself for unknown types', () => {
      expect(getOperationTypeLabel('UNKNOWN' as EditOperationType)).toBe('UNKNOWN');
    });
  });

  // ====================================
  // getOperationTypeColor Tests
  // ====================================

  describe('getOperationTypeColor', () => {
    it('should return correct colors', () => {
      expect(getOperationTypeColor(EditOperationType.CREATE)).toContain('green');
      expect(getOperationTypeColor(EditOperationType.UPDATE)).toContain('blue');
      expect(getOperationTypeColor(EditOperationType.DELETE)).toContain('red');
      expect(getOperationTypeColor(EditOperationType.RESTORE)).toContain('purple');
    });

    it('should return empty string for unknown types', () => {
      expect(getOperationTypeColor('UNKNOWN' as EditOperationType)).toBe('');
    });
  });

  // ====================================
  // getDiffTypeLabel Tests
  // ====================================

  describe('getDiffTypeLabel', () => {
    it('should return correct labels', () => {
      expect(getDiffTypeLabel(DiffType.ADDED)).toBe('追加');
      expect(getDiffTypeLabel(DiffType.REMOVED)).toBe('削除');
      expect(getDiffTypeLabel(DiffType.MODIFIED)).toBe('変更');
      expect(getDiffTypeLabel(DiffType.UNCHANGED)).toBe('変更なし');
    });

    it('should return type itself for unknown types', () => {
      expect(getDiffTypeLabel('UNKNOWN' as DiffType)).toBe('UNKNOWN');
    });
  });

  // ====================================
  // getDiffTypeColor Tests
  // ====================================

  describe('getDiffTypeColor', () => {
    it('should return correct colors', () => {
      expect(getDiffTypeColor(DiffType.ADDED)).toContain('green');
      expect(getDiffTypeColor(DiffType.REMOVED)).toContain('red');
      expect(getDiffTypeColor(DiffType.MODIFIED)).toContain('yellow');
      expect(getDiffTypeColor(DiffType.UNCHANGED)).toContain('gray');
    });

    it('should return empty string for unknown types', () => {
      expect(getDiffTypeColor('UNKNOWN' as DiffType)).toBe('');
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
      expect(getFieldLabel('expectedResult')).toBe('期待結果');
      expect(getFieldLabel('priority')).toBe('優先度');
      expect(getFieldLabel('testType')).toBe('テストタイプ');
      expect(getFieldLabel('steps')).toBe('テストステップ');
      expect(getFieldLabel('tags')).toBe('タグ');
    });

    it('should return field name for unknown fields', () => {
      expect(getFieldLabel('unknownField')).toBe('unknownField');
    });
  });

  // ====================================
  // valueToString Tests
  // ====================================

  describe('valueToString', () => {
    it('should handle null and undefined', () => {
      expect(valueToString(null)).toBe('');
      expect(valueToString(undefined)).toBe('');
    });

    it('should handle strings', () => {
      expect(valueToString('hello')).toBe('hello');
    });

    it('should handle numbers', () => {
      expect(valueToString(42)).toBe('42');
    });

    it('should handle arrays', () => {
      expect(valueToString(['a', 'b', 'c'])).toBe('a, b, c');
    });

    it('should handle objects', () => {
      const result = valueToString({ key: 'value' });
      expect(result).toContain('key');
      expect(result).toContain('value');
    });

    it('should handle boolean', () => {
      expect(valueToString(true)).toBe('true');
      expect(valueToString(false)).toBe('false');
    });
  });

  // ====================================
  // computeLineDiff Tests
  // ====================================

  describe('computeLineDiff', () => {
    it('should detect added lines', () => {
      const { previousLines, currentLines } = computeLineDiff('line1', 'line1\nline2');

      expect(previousLines).toHaveLength(1);
      expect(currentLines).toHaveLength(2);
      expect(currentLines[1].type).toBe(DiffType.ADDED);
    });

    it('should detect removed lines', () => {
      const { previousLines, currentLines } = computeLineDiff('line1\nline2', 'line1');

      expect(previousLines).toHaveLength(2);
      expect(currentLines).toHaveLength(1);
      expect(previousLines[1].type).toBe(DiffType.REMOVED);
    });

    it('should detect modified lines', () => {
      const { previousLines, currentLines } = computeLineDiff('old line', 'new line');

      expect(previousLines[0].type).toBe(DiffType.MODIFIED);
      expect(currentLines[0].type).toBe(DiffType.MODIFIED);
    });

    it('should detect unchanged lines', () => {
      const { previousLines, currentLines } = computeLineDiff('same line', 'same line');

      expect(previousLines[0].type).toBe(DiffType.UNCHANGED);
      expect(currentLines[0].type).toBe(DiffType.UNCHANGED);
    });

    it('should handle multi-line content', () => {
      const prev = 'line1\nline2\nline3';
      const curr = 'line1\nmodified\nline3';
      const { previousLines, currentLines } = computeLineDiff(prev, curr);

      expect(previousLines[0].type).toBe(DiffType.UNCHANGED);
      expect(previousLines[1].type).toBe(DiffType.MODIFIED);
      expect(previousLines[2].type).toBe(DiffType.UNCHANGED);
      expect(currentLines[1].type).toBe(DiffType.MODIFIED);
    });
  });

  // ====================================
  // computeFieldDiff Tests
  // ====================================

  describe('computeFieldDiff', () => {
    it('should detect no changes', () => {
      const result = computeFieldDiff('title', 'Same Value', 'Same Value');

      expect(result.hasChanges).toBe(false);
      expect(result.fieldLabel).toBe('タイトル');
    });

    it('should detect simple changes', () => {
      const result = computeFieldDiff('title', 'Old Title', 'New Title');

      expect(result.hasChanges).toBe(true);
      expect(result.previousValue).toBe('Old Title');
      expect(result.currentValue).toBe('New Title');
    });

    it('should handle long text with line diff', () => {
      const longPrev = 'Line 1\nLine 2\nLine 3';
      const longCurr = 'Line 1\nModified\nLine 3';
      const result = computeFieldDiff('description', longPrev, longCurr);

      expect(result.hasChanges).toBe(true);
      expect(result.previousLines).toBeDefined();
      expect(result.currentLines).toBeDefined();
    });

    it('should handle arrays', () => {
      const result = computeFieldDiff('tags', ['tag1', 'tag2'], ['tag1', 'tag3']);

      expect(result.hasChanges).toBe(true);
      expect(result.previousValue).toBe('tag1, tag2');
      expect(result.currentValue).toBe('tag1, tag3');
    });
  });

  // ====================================
  // generateEditSummary Tests
  // ====================================

  describe('generateEditSummary', () => {
    it('should generate create summary', () => {
      const summary = generateEditSummary(EditOperationType.CREATE, []);
      expect(summary).toBe('テストケースを作成しました');
    });

    it('should generate delete summary', () => {
      const summary = generateEditSummary(EditOperationType.DELETE, []);
      expect(summary).toBe('テストケースを削除しました');
    });

    it('should generate restore summary', () => {
      const summary = generateEditSummary(EditOperationType.RESTORE, []);
      expect(summary).toBe('テストケースを復元しました');
    });

    it('should generate single field update summary', () => {
      const changes: FieldChange[] = [
        { field: 'title', fieldLabel: 'タイトル', previousValue: 'Old', newValue: 'New' },
      ];
      const summary = generateEditSummary(EditOperationType.UPDATE, changes);
      expect(summary).toBe('タイトルを更新しました');
    });

    it('should generate multiple fields update summary', () => {
      const changes: FieldChange[] = [
        { field: 'title', fieldLabel: 'タイトル', previousValue: 'Old', newValue: 'New' },
        { field: 'description', fieldLabel: '説明', previousValue: 'Old', newValue: 'New' },
        { field: 'priority', fieldLabel: '優先度', previousValue: 'LOW', newValue: 'HIGH' },
      ];
      const summary = generateEditSummary(EditOperationType.UPDATE, changes);
      expect(summary).toBe('3件のフィールドを更新しました');
    });

    it('should handle empty changes for update', () => {
      const summary = generateEditSummary(EditOperationType.UPDATE, []);
      expect(summary).toBe('変更なし');
    });
  });

  // ====================================
  // formatEditDate Tests
  // ====================================

  describe('formatEditDate', () => {
    it('should format date correctly', () => {
      const date = new Date('2026-05-27T10:30:00');
      const formatted = formatEditDate(date);

      expect(formatted).toContain('2026');
      expect(formatted).toContain('05');
      expect(formatted).toContain('27');
    });

    it('should handle string dates', () => {
      const formatted = formatEditDate('2026-05-27T10:30:00');

      expect(formatted).toContain('2026');
    });
  });

  // ====================================
  // getRelativeTime Tests
  // ====================================

  describe('getRelativeTime', () => {
    it('should return "たった今" for recent times', () => {
      const now = new Date();
      const result = getRelativeTime(now);
      expect(result).toBe('たった今');
    });

    it('should return minutes ago', () => {
      const date = new Date(Date.now() - 5 * 60 * 1000); // 5 minutes ago
      const result = getRelativeTime(date);
      expect(result).toContain('分前');
    });

    it('should return hours ago', () => {
      const date = new Date(Date.now() - 3 * 60 * 60 * 1000); // 3 hours ago
      const result = getRelativeTime(date);
      expect(result).toContain('時間前');
    });

    it('should return days ago', () => {
      const date = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000); // 2 days ago
      const result = getRelativeTime(date);
      expect(result).toContain('日前');
    });

    it('should return formatted date for old dates', () => {
      const date = new Date(Date.now() - 10 * 24 * 60 * 60 * 1000); // 10 days ago
      const result = getRelativeTime(date);
      // Should be a formatted date string
      expect(result).not.toContain('日前');
    });
  });
});
