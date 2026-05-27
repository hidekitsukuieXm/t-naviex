/**
 * Matrix Types Tests
 */

import { describe, it, expect } from 'vitest';
import {
  MatrixCellValue,
  MatrixCellStatus,
  MatrixAxisType,
  MatrixExpansionStrategy,
  MatrixDefinition,
  MatrixAxisItem,
  MatrixCell,
  getCellValueLabel,
  getCellValueColor,
  getCellStatusLabel,
  getAxisTypeLabel,
  getExpansionStrategyLabel,
  createEmptyMatrix,
  calculateMatrixStats,
  generateTestCaseTitle,
  DEFAULT_TITLE_TEMPLATE,
  matrixToCsv,
} from '../matrix';

describe('Matrix Types', () => {
  describe('Constants', () => {
    it('MatrixCellValue should have all expected values', () => {
      expect(MatrixCellValue.EMPTY).toBe('EMPTY');
      expect(MatrixCellValue.YES).toBe('YES');
      expect(MatrixCellValue.NO).toBe('NO');
      expect(MatrixCellValue.NA).toBe('NA');
      expect(MatrixCellValue.PASS).toBe('PASS');
      expect(MatrixCellValue.FAIL).toBe('FAIL');
      expect(MatrixCellValue.PENDING).toBe('PENDING');
      expect(MatrixCellValue.CUSTOM).toBe('CUSTOM');
    });

    it('MatrixCellStatus should have all expected values', () => {
      expect(MatrixCellStatus.NOT_STARTED).toBe('NOT_STARTED');
      expect(MatrixCellStatus.IN_PROGRESS).toBe('IN_PROGRESS');
      expect(MatrixCellStatus.COMPLETED).toBe('COMPLETED');
      expect(MatrixCellStatus.SKIPPED).toBe('SKIPPED');
    });

    it('MatrixAxisType should have all expected values', () => {
      expect(MatrixAxisType.TEXT).toBe('TEXT');
      expect(MatrixAxisType.CONDITION).toBe('CONDITION');
      expect(MatrixAxisType.INPUT).toBe('INPUT');
      expect(MatrixAxisType.STATE).toBe('STATE');
      expect(MatrixAxisType.ENVIRONMENT).toBe('ENVIRONMENT');
      expect(MatrixAxisType.USER_TYPE).toBe('USER_TYPE');
      expect(MatrixAxisType.FEATURE).toBe('FEATURE');
      expect(MatrixAxisType.CUSTOM).toBe('CUSTOM');
    });

    it('MatrixExpansionStrategy should have all expected values', () => {
      expect(MatrixExpansionStrategy.ALL_COMBINATIONS).toBe('ALL_COMBINATIONS');
      expect(MatrixExpansionStrategy.YES_CELLS_ONLY).toBe('YES_CELLS_ONLY');
      expect(MatrixExpansionStrategy.NON_EMPTY_CELLS).toBe('NON_EMPTY_CELLS');
      expect(MatrixExpansionStrategy.MANUAL_SELECTION).toBe('MANUAL_SELECTION');
    });
  });

  describe('getCellValueLabel', () => {
    it('should return correct Japanese labels', () => {
      expect(getCellValueLabel('EMPTY')).toBe('空');
      expect(getCellValueLabel('YES')).toBe('はい');
      expect(getCellValueLabel('NO')).toBe('いいえ');
      expect(getCellValueLabel('NA')).toBe('該当なし');
      expect(getCellValueLabel('PASS')).toBe('合格');
      expect(getCellValueLabel('FAIL')).toBe('不合格');
      expect(getCellValueLabel('PENDING')).toBe('保留');
      expect(getCellValueLabel('CUSTOM')).toBe('カスタム');
    });

    it('should return value itself for unknown values', () => {
      expect(getCellValueLabel('UNKNOWN' as MatrixCellValue)).toBe('UNKNOWN');
    });
  });

  describe('getCellValueColor', () => {
    it('should return correct colors', () => {
      expect(getCellValueColor('EMPTY')).toBe('#e5e7eb');
      expect(getCellValueColor('YES')).toBe('#22c55e');
      expect(getCellValueColor('NO')).toBe('#ef4444');
      expect(getCellValueColor('NA')).toBe('#9ca3af');
      expect(getCellValueColor('PASS')).toBe('#22c55e');
      expect(getCellValueColor('FAIL')).toBe('#ef4444');
      expect(getCellValueColor('PENDING')).toBe('#f59e0b');
      expect(getCellValueColor('CUSTOM')).toBe('#3b82f6');
    });

    it('should return default color for unknown values', () => {
      expect(getCellValueColor('UNKNOWN' as MatrixCellValue)).toBe('#e5e7eb');
    });
  });

  describe('getCellStatusLabel', () => {
    it('should return correct Japanese labels', () => {
      expect(getCellStatusLabel('NOT_STARTED')).toBe('未着手');
      expect(getCellStatusLabel('IN_PROGRESS')).toBe('進行中');
      expect(getCellStatusLabel('COMPLETED')).toBe('完了');
      expect(getCellStatusLabel('SKIPPED')).toBe('スキップ');
    });
  });

  describe('getAxisTypeLabel', () => {
    it('should return correct Japanese labels', () => {
      expect(getAxisTypeLabel('TEXT')).toBe('テキスト');
      expect(getAxisTypeLabel('CONDITION')).toBe('条件');
      expect(getAxisTypeLabel('INPUT')).toBe('入力値');
      expect(getAxisTypeLabel('STATE')).toBe('状態');
      expect(getAxisTypeLabel('ENVIRONMENT')).toBe('環境');
      expect(getAxisTypeLabel('USER_TYPE')).toBe('ユーザータイプ');
      expect(getAxisTypeLabel('FEATURE')).toBe('機能');
      expect(getAxisTypeLabel('CUSTOM')).toBe('カスタム');
    });
  });

  describe('getExpansionStrategyLabel', () => {
    it('should return correct Japanese labels', () => {
      expect(getExpansionStrategyLabel('ALL_COMBINATIONS')).toBe('すべての組み合わせ');
      expect(getExpansionStrategyLabel('YES_CELLS_ONLY')).toBe('YESセルのみ');
      expect(getExpansionStrategyLabel('NON_EMPTY_CELLS')).toBe('空でないセルすべて');
      expect(getExpansionStrategyLabel('MANUAL_SELECTION')).toBe('手動選択');
    });
  });

  describe('createEmptyMatrix', () => {
    it('should create a matrix with default dimensions (3x3)', () => {
      const matrix = createEmptyMatrix('Test Matrix');

      expect(matrix.name).toBe('Test Matrix');
      expect(matrix.rowAxis.items).toHaveLength(3);
      expect(matrix.columnAxis.items).toHaveLength(3);
      expect(matrix.cells).toHaveLength(3);
      expect(matrix.cells[0]).toHaveLength(3);
    });

    it('should create a matrix with custom dimensions', () => {
      const matrix = createEmptyMatrix('Custom Matrix', 5, 4);

      expect(matrix.rowAxis.items).toHaveLength(5);
      expect(matrix.columnAxis.items).toHaveLength(4);
      expect(matrix.cells).toHaveLength(5);
      expect(matrix.cells[0]).toHaveLength(4);
    });

    it('should initialize all cells as EMPTY', () => {
      const matrix = createEmptyMatrix('Empty Matrix', 2, 2);

      for (const row of matrix.cells) {
        for (const cell of row) {
          expect(cell.value).toBe('EMPTY');
        }
      }
    });

    it('should set correct row and column indices', () => {
      const matrix = createEmptyMatrix('Index Matrix', 2, 3);

      matrix.cells.forEach((row, rowIndex) => {
        row.forEach((cell, colIndex) => {
          expect(cell.rowIndex).toBe(rowIndex);
          expect(cell.columnIndex).toBe(colIndex);
        });
      });
    });

    it('should generate unique IDs', () => {
      const matrix1 = createEmptyMatrix('Matrix 1');
      const matrix2 = createEmptyMatrix('Matrix 2');

      expect(matrix1.id).not.toBe(matrix2.id);
      expect(matrix1.rowAxis.id).not.toBe(matrix2.rowAxis.id);
    });
  });

  describe('calculateMatrixStats', () => {
    it('should count total cells correctly', () => {
      const matrix = createEmptyMatrix('Stats Test', 3, 4);
      const stats = calculateMatrixStats(matrix);

      expect(stats.totalCells).toBe(12);
    });

    it('should count cell values correctly', () => {
      const matrix = createEmptyMatrix('Stats Test', 2, 2);
      matrix.cells[0][0].value = 'YES';
      matrix.cells[0][1].value = 'NO';
      matrix.cells[1][0].value = 'NA';
      matrix.cells[1][1].value = 'EMPTY';

      const stats = calculateMatrixStats(matrix);

      expect(stats.yesCells).toBe(1);
      expect(stats.noCells).toBe(1);
      expect(stats.naCells).toBe(1);
      expect(stats.emptyCells).toBe(1);
    });

    it('should count pass/fail cells', () => {
      const matrix = createEmptyMatrix('Pass/Fail Test', 2, 2);
      matrix.cells[0][0].value = 'PASS';
      matrix.cells[0][1].value = 'PASS';
      matrix.cells[1][0].value = 'FAIL';
      matrix.cells[1][1].value = 'EMPTY';

      const stats = calculateMatrixStats(matrix);

      expect(stats.passedCells).toBe(2);
      expect(stats.failedCells).toBe(1);
    });

    it('should count expanded test cases', () => {
      const matrix = createEmptyMatrix('Expanded Test', 2, 2);
      matrix.cells[0][0].testCaseIds = [1, 2];
      matrix.cells[1][1].testCaseIds = [3];

      const stats = calculateMatrixStats(matrix);

      expect(stats.expandedTestCases).toBe(3);
    });

    it('should count completed cells', () => {
      const matrix = createEmptyMatrix('Completed Test', 2, 2);
      matrix.cells[0][0].status = 'COMPLETED';
      matrix.cells[1][1].status = 'COMPLETED';

      const stats = calculateMatrixStats(matrix);

      expect(stats.completedCells).toBe(2);
    });
  });

  describe('generateTestCaseTitle', () => {
    const rowItem: MatrixAxisItem = { id: 'r1', value: 'Chrome', sortOrder: 0 };
    const colItem: MatrixAxisItem = { id: 'c1', value: 'Windows', sortOrder: 0 };

    it('should replace {row} placeholder', () => {
      const title = generateTestCaseTitle('{row} test', rowItem, colItem);
      expect(title).toBe('Chrome test');
    });

    it('should replace {column} placeholder', () => {
      const title = generateTestCaseTitle('{column} test', rowItem, colItem);
      expect(title).toBe('Windows test');
    });

    it('should replace {matrix} placeholder', () => {
      const title = generateTestCaseTitle('{matrix} test', rowItem, colItem, 'Browser Matrix');
      expect(title).toBe('Browser Matrix test');
    });

    it('should use default matrix name when not provided', () => {
      const title = generateTestCaseTitle('{matrix} test', rowItem, colItem);
      expect(title).toBe('マトリクス test');
    });

    it('should replace all placeholders in default template', () => {
      const title = generateTestCaseTitle(DEFAULT_TITLE_TEMPLATE, rowItem, colItem);
      expect(title).toBe('Chrome × Windows');
    });

    it('should handle complex templates', () => {
      const template = '[{matrix}] {row} on {column}';
      const title = generateTestCaseTitle(template, rowItem, colItem, 'Login Test');
      expect(title).toBe('[Login Test] Chrome on Windows');
    });
  });

  describe('matrixToCsv', () => {
    it('should convert matrix to CSV format', () => {
      const matrix = createEmptyMatrix('CSV Test', 2, 2);
      matrix.rowAxis.name = 'ブラウザ';
      matrix.columnAxis.name = 'OS';
      matrix.rowAxis.items[0].value = 'Chrome';
      matrix.rowAxis.items[1].value = 'Firefox';
      matrix.columnAxis.items[0].value = 'Windows';
      matrix.columnAxis.items[1].value = 'Mac';
      matrix.cells[0][0].value = 'YES';
      matrix.cells[0][1].value = 'NO';
      matrix.cells[1][0].value = 'YES';
      matrix.cells[1][1].value = 'YES';

      const csv = matrixToCsv(matrix);
      const lines = csv.split('\n');

      expect(lines).toHaveLength(3);
      expect(lines[0]).toBe('"","Windows","Mac"');
      expect(lines[1]).toBe('"Chrome","はい","いいえ"');
      expect(lines[2]).toBe('"Firefox","はい","はい"');
    });

    it('should handle empty matrix', () => {
      const matrix = createEmptyMatrix('Empty CSV', 1, 1);
      const csv = matrixToCsv(matrix);

      expect(csv).toContain('空');
    });
  });

  describe('DEFAULT_TITLE_TEMPLATE', () => {
    it('should have the expected value', () => {
      expect(DEFAULT_TITLE_TEMPLATE).toBe('{row} × {column}');
    });
  });
});
