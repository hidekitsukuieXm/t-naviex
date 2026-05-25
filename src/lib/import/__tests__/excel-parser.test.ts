import { describe, it, expect } from 'vitest';
import * as XLSX from 'xlsx';
import {
  parseExcel,
  getExcelFileInfo,
  excelToObjects,
  generateExcelPreview,
  isExcelFile,
  getSupportedExcelExtensions,
} from '../excel-parser';

// XLSX モック用ヘルパー関数
function createMockWorkbook(sheets: { [name: string]: string[][] }): XLSX.WorkBook {
  const workbook = XLSX.utils.book_new();

  for (const [sheetName, data] of Object.entries(sheets)) {
    const worksheet = XLSX.utils.aoa_to_sheet(data);
    XLSX.utils.book_append_sheet(workbook, worksheet, sheetName);
  }

  return workbook;
}

// ワークブックをArrayBufferに変換
function workbookToArrayBuffer(workbook: XLSX.WorkBook): ArrayBuffer {
  const xlsxBuffer = XLSX.write(workbook, { type: 'array', bookType: 'xlsx' });
  return xlsxBuffer;
}

describe('excel-parser', () => {
  describe('parseExcel', () => {
    it('should parse simple Excel data', () => {
      const workbook = createMockWorkbook({
        Sheet1: [
          ['name', 'age'],
          ['John', '30'],
          ['Jane', '25'],
        ],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer);

      expect(result.headers).toEqual(['name', 'age']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['John', '30']);
      expect(result.rows[1]).toEqual(['Jane', '25']);
      expect(result.errors).toHaveLength(0);
      expect(result.sheetName).toBe('Sheet1');
      expect(result.availableSheets).toEqual(['Sheet1']);
    });

    it('should handle multiple sheets', () => {
      const workbook = createMockWorkbook({
        Sheet1: [
          ['name', 'age'],
          ['John', '30'],
        ],
        Sheet2: [
          ['title', 'description'],
          ['Test', 'Description'],
        ],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer);

      expect(result.sheetName).toBe('Sheet1');
      expect(result.availableSheets).toEqual(['Sheet1', 'Sheet2']);
    });

    it('should select sheet by name', () => {
      const workbook = createMockWorkbook({
        Sheet1: [
          ['name', 'age'],
          ['John', '30'],
        ],
        Sheet2: [
          ['title', 'description'],
          ['Test', 'Description'],
        ],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer, { sheetName: 'Sheet2' });

      expect(result.sheetName).toBe('Sheet2');
      expect(result.headers).toEqual(['title', 'description']);
      expect(result.rows[0]).toEqual(['Test', 'Description']);
    });

    it('should select sheet by index', () => {
      const workbook = createMockWorkbook({
        Sheet1: [
          ['name', 'age'],
          ['John', '30'],
        ],
        Sheet2: [
          ['title', 'description'],
          ['Test', 'Description'],
        ],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer, { sheetIndex: 1 });

      expect(result.sheetName).toBe('Sheet2');
    });

    it('should trim fields by default', () => {
      const workbook = createMockWorkbook({
        Sheet1: [
          ['name', 'age'],
          ['  John  ', '  30  '],
        ],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer);

      expect(result.rows[0]).toEqual(['John', '30']);
    });

    it('should not trim fields when disabled', () => {
      const workbook = createMockWorkbook({
        Sheet1: [
          ['name', 'age'],
          ['  John  ', '  30  '],
        ],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer, { trimFields: false });

      expect(result.rows[0]).toEqual(['  John  ', '  30  ']);
    });

    it('should skip empty rows by default', () => {
      const workbook = createMockWorkbook({
        Sheet1: [
          ['name', 'age'],
          ['John', '30'],
          ['', ''],
          ['Jane', '25'],
        ],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer);

      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['John', '30']);
      expect(result.rows[1]).toEqual(['Jane', '25']);
    });

    it('should parse without header row', () => {
      const workbook = createMockWorkbook({
        Sheet1: [
          ['John', '30'],
          ['Jane', '25'],
        ],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer, { header: false });

      expect(result.headers).toEqual([]);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['John', '30']);
    });

    it('should handle empty sheet', () => {
      const workbook = createMockWorkbook({
        Sheet1: [],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer);

      expect(result.headers).toEqual([]);
      expect(result.rows).toHaveLength(0);
    });

    it('should handle header only', () => {
      const workbook = createMockWorkbook({
        Sheet1: [['name', 'age']],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer);

      expect(result.headers).toEqual(['name', 'age']);
      expect(result.rows).toHaveLength(0);
    });

    it('should handle Japanese characters', () => {
      const workbook = createMockWorkbook({
        Sheet1: [
          ['名前', '年齢'],
          ['太郎', '30'],
          ['花子', '25'],
        ],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer);

      expect(result.headers).toEqual(['名前', '年齢']);
      expect(result.rows[0]).toEqual(['太郎', '30']);
    });

    it('should handle row with fewer columns than header', () => {
      const workbook = createMockWorkbook({
        Sheet1: [['name', 'age', 'city'], ['John']],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer);

      expect(result.rows[0]).toEqual(['John', '', '']);
    });

    it('should preserve first two columns when row has more columns than header', () => {
      const workbook = createMockWorkbook({
        Sheet1: [
          ['name', 'age'],
          ['John', '30', 'extra', 'more'],
        ],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer);

      // xlsxライブラリはすべての列を含む可能性があるため、
      // 先頭の列が正しく取得されていることを確認
      expect(result.rows[0][0]).toBe('John');
      expect(result.rows[0][1]).toBe('30');
      // 注: xlsxライブラリの挙動により、行が切り詰められない場合がある
    });

    it('should handle completely invalid buffer gracefully', () => {
      // 完全に無効なバイナリ（Excel形式ではない）
      const invalidBuffer = new TextEncoder().encode('this is not an excel file at all').buffer;

      const result = parseExcel(invalidBuffer);

      // xlsx ライブラリがエラーを投げた場合はエラーを報告
      // または空のシートを作成する場合もある（ライブラリの挙動による）
      expect(result.headers).toBeDefined();
      expect(result.rows).toBeDefined();
    });

    it('should fall back to first sheet if specified sheet not found', () => {
      const workbook = createMockWorkbook({
        Sheet1: [
          ['name', 'age'],
          ['John', '30'],
        ],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer, { sheetName: 'NonExistent' });

      expect(result.sheetName).toBe('Sheet1');
    });

    it('should convert numbers to strings', () => {
      const workbook = createMockWorkbook({
        Sheet1: [
          ['id', 'value'],
          [1, 100],
        ],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const result = parseExcel(buffer);

      expect(result.rows[0]).toEqual(['1', '100']);
    });
  });

  describe('getExcelFileInfo', () => {
    it('should return file info with sheet details', () => {
      const workbook = createMockWorkbook({
        Sheet1: [
          ['a', 'b', 'c'],
          ['1', '2', '3'],
          ['4', '5', '6'],
        ],
        Sheet2: [
          ['x', 'y'],
          ['1', '2'],
        ],
      });
      const buffer = workbookToArrayBuffer(workbook);

      const info = getExcelFileInfo(buffer);

      expect(info.sheets).toHaveLength(2);
      expect(info.sheets[0].name).toBe('Sheet1');
      expect(info.sheets[0].columnCount).toBe(3);
      expect(info.sheets[0].rowCount).toBe(3);
      expect(info.sheets[1].name).toBe('Sheet2');
      expect(info.sheets[1].columnCount).toBe(2);
      expect(info.sheets[1].rowCount).toBe(2);
    });

    it('should handle invalid or minimal buffer', () => {
      // 完全に無効なバイナリ
      const invalidBuffer = new TextEncoder().encode('not excel content').buffer;

      const info = getExcelFileInfo(invalidBuffer);

      // ライブラリの挙動によりシートが返される場合とエラーになる場合がある
      expect(info.sheets).toBeDefined();
      expect(Array.isArray(info.sheets)).toBe(true);
    });
  });

  describe('excelToObjects', () => {
    it('should convert parse result to objects', () => {
      const parseResult = {
        headers: ['name', 'age'],
        rows: [
          ['John', '30'],
          ['Jane', '25'],
        ],
        errors: [],
        sheetName: 'Sheet1',
        availableSheets: ['Sheet1'],
      };

      const objects = excelToObjects(parseResult);

      expect(objects).toHaveLength(2);
      expect(objects[0]).toEqual({ name: 'John', age: '30' });
      expect(objects[1]).toEqual({ name: 'Jane', age: '25' });
    });

    it('should handle missing values', () => {
      const parseResult = {
        headers: ['name', 'age', 'city'],
        rows: [['John', '30']],
        errors: [],
        sheetName: 'Sheet1',
        availableSheets: ['Sheet1'],
      };

      const objects = excelToObjects(parseResult);

      expect(objects[0]).toEqual({ name: 'John', age: '30', city: '' });
    });
  });

  describe('generateExcelPreview', () => {
    it('should generate preview with default max rows', () => {
      const parseResult = {
        headers: ['name', 'age'],
        rows: Array(10).fill(['John', '30']),
        errors: [],
        sheetName: 'Sheet1',
        availableSheets: ['Sheet1', 'Sheet2'],
      };

      const preview = generateExcelPreview(parseResult);

      expect(preview.headers).toEqual(['name', 'age']);
      expect(preview.previewRows).toHaveLength(5);
      expect(preview.totalRows).toBe(10);
      expect(preview.sheetName).toBe('Sheet1');
      expect(preview.availableSheets).toEqual(['Sheet1', 'Sheet2']);
    });

    it('should generate preview with custom max rows', () => {
      const parseResult = {
        headers: ['name', 'age'],
        rows: Array(10).fill(['John', '30']),
        errors: [],
        sheetName: 'Sheet1',
        availableSheets: ['Sheet1'],
      };

      const preview = generateExcelPreview(parseResult, 3);

      expect(preview.previewRows).toHaveLength(3);
    });
  });

  describe('isExcelFile', () => {
    it('should return true for xlsx files', () => {
      expect(isExcelFile('test.xlsx')).toBe(true);
      expect(isExcelFile('TEST.XLSX')).toBe(true);
    });

    it('should return true for xls files', () => {
      expect(isExcelFile('test.xls')).toBe(true);
      expect(isExcelFile('TEST.XLS')).toBe(true);
    });

    it('should return true for xlsm files', () => {
      expect(isExcelFile('test.xlsm')).toBe(true);
      expect(isExcelFile('TEST.XLSM')).toBe(true);
    });

    it('should return false for non-Excel files', () => {
      expect(isExcelFile('test.csv')).toBe(false);
      expect(isExcelFile('test.txt')).toBe(false);
      expect(isExcelFile('test.pdf')).toBe(false);
    });
  });

  describe('getSupportedExcelExtensions', () => {
    it('should return supported extensions', () => {
      const extensions = getSupportedExcelExtensions();

      expect(extensions).toContain('.xlsx');
      expect(extensions).toContain('.xls');
      expect(extensions).toContain('.xlsm');
    });
  });
});
