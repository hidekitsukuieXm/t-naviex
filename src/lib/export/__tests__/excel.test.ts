import { describe, it, expect } from 'vitest';
import {
  generateExcelWorkbook,
  generateExcelWorkbookWithSheets,
  workbookToBuffer,
  workbookToUint8Array,
  cellRef,
  colName,
  dateToExcelSerial,
  getExcelColumnsForTestCases,
  generateTestSpecExcel,
} from '../excel';
import type { ExcelColumn } from '../excel';
import type { TestCaseExportData } from '../test-case-export';

describe('excel', () => {
  describe('generateExcelWorkbook', () => {
    interface TestData {
      id: number;
      name: string;
      value: number | null;
    }

    const columns: ExcelColumn<TestData>[] = [
      { key: 'id', header: 'ID', getValue: (row) => row.id, width: 10 },
      { key: 'name', header: '名前', getValue: (row) => row.name, width: 20 },
      { key: 'value', header: '値', getValue: (row) => row.value, width: 15 },
    ];

    const testData: TestData[] = [
      { id: 1, name: 'Item 1', value: 100 },
      { id: 2, name: 'Item 2', value: null },
      { id: 3, name: 'Item 3', value: 300 },
    ];

    it('should generate Excel workbook with data', () => {
      const wb = generateExcelWorkbook(testData, columns);

      expect(wb.SheetNames).toHaveLength(1);
      expect(wb.SheetNames[0]).toBe('Sheet1');

      const ws = wb.Sheets['Sheet1'];
      expect(ws).toBeDefined();

      // Check header row
      expect(ws['A1']?.v).toBe('ID');
      expect(ws['B1']?.v).toBe('名前');
      expect(ws['C1']?.v).toBe('値');

      // Check data row
      expect(ws['A2']?.v).toBe(1);
      expect(ws['B2']?.v).toBe('Item 1');
      expect(ws['C2']?.v).toBe(100);
    });

    it('should set custom sheet name', () => {
      const wb = generateExcelWorkbook(testData, columns, { sheetName: 'カスタム' });

      expect(wb.SheetNames[0]).toBe('カスタム');
    });

    it('should set column widths', () => {
      const wb = generateExcelWorkbook(testData, columns);
      const ws = wb.Sheets['Sheet1'];

      expect(ws['!cols']).toBeDefined();
      expect(ws['!cols']?.[0]?.wch).toBe(10);
      expect(ws['!cols']?.[1]?.wch).toBe(20);
      expect(ws['!cols']?.[2]?.wch).toBe(15);
    });

    it('should handle empty data', () => {
      const wb = generateExcelWorkbook([], columns);
      const ws = wb.Sheets['Sheet1'];

      // Should have header row only
      expect(ws['A1']?.v).toBe('ID');
      expect(ws['A2']).toBeUndefined();
    });
  });

  describe('generateExcelWorkbookWithSheets', () => {
    it('should generate workbook with multiple sheets', () => {
      const wb = generateExcelWorkbookWithSheets([
        {
          name: 'Sheet1',
          data: [{ id: 1, name: 'A' }],
          columns: [
            { key: 'id', header: 'ID', getValue: (row) => row.id },
            { key: 'name', header: 'Name', getValue: (row) => row.name },
          ],
        },
        {
          name: 'Sheet2',
          data: [{ code: 'X', value: 100 }],
          columns: [
            { key: 'code', header: 'Code', getValue: (row) => row.code },
            { key: 'value', header: 'Value', getValue: (row) => row.value },
          ],
        },
      ]);

      expect(wb.SheetNames).toHaveLength(2);
      expect(wb.SheetNames[0]).toBe('Sheet1');
      expect(wb.SheetNames[1]).toBe('Sheet2');

      expect(wb.Sheets['Sheet1']['A1']?.v).toBe('ID');
      expect(wb.Sheets['Sheet2']['A1']?.v).toBe('Code');
    });
  });

  describe('workbookToBuffer', () => {
    it('should convert workbook to buffer', () => {
      const wb = generateExcelWorkbook(
        [{ id: 1 }],
        [{ key: 'id', header: 'ID', getValue: (r) => r.id }]
      );
      const buffer = workbookToBuffer(wb);

      expect(buffer).toBeInstanceOf(Buffer);
      expect(buffer.length).toBeGreaterThan(0);
    });
  });

  describe('workbookToUint8Array', () => {
    it('should convert workbook to Uint8Array', () => {
      const wb = generateExcelWorkbook(
        [{ id: 1 }],
        [{ key: 'id', header: 'ID', getValue: (r) => r.id }]
      );
      const array = workbookToUint8Array(wb);

      expect(array).toBeInstanceOf(Uint8Array);
      expect(array.length).toBeGreaterThan(0);
    });
  });

  describe('cellRef', () => {
    it('should generate A1 style cell reference', () => {
      expect(cellRef(0, 0)).toBe('A1');
      expect(cellRef(0, 25)).toBe('Z1');
      expect(cellRef(9, 0)).toBe('A10');
    });
  });

  describe('colName', () => {
    it('should generate column name', () => {
      expect(colName(0)).toBe('A');
      expect(colName(25)).toBe('Z');
      expect(colName(26)).toBe('AA');
    });
  });

  describe('dateToExcelSerial', () => {
    it('should convert date to Excel serial number', () => {
      // January 1, 1900 should be serial number 1 (but Excel has a bug with 1900 being leap year)
      const serial = dateToExcelSerial(new Date(Date.UTC(2024, 0, 1)));
      expect(serial).toBeGreaterThan(45000); // Some reasonable value for 2024
    });
  });

  describe('getExcelColumnsForTestCases', () => {
    it('should return columns for specified keys', () => {
      const columns = getExcelColumnsForTestCases(['id', 'title', 'priority'], false, 0);

      expect(columns).toHaveLength(3);
      expect(columns[0].key).toBe('id');
      expect(columns[1].key).toBe('title');
      expect(columns[2].key).toBe('priority');
    });

    it('should include step columns when includeSteps is true', () => {
      const columns = getExcelColumnsForTestCases(['id', 'title'], true, 2);

      expect(columns.length).toBe(6); // 2 base + 4 step columns
      expect(columns[2].key).toBe('step1_action');
      expect(columns[3].key).toBe('step1_expected');
      expect(columns[4].key).toBe('step2_action');
      expect(columns[5].key).toBe('step2_expected');
    });

    it('should set appropriate column widths', () => {
      const columns = getExcelColumnsForTestCases(['id', 'title', 'description'], false, 0);

      expect(columns[0].width).toBe(10); // id
      expect(columns[1].width).toBe(40); // title
      expect(columns[2].width).toBe(50); // description
    });
  });

  describe('generateTestSpecExcel', () => {
    const mockTestCases: TestCaseExportData[] = [
      {
        id: '1',
        testCaseNumber: 'TC-0001',
        referenceId: null,
        title: 'テストケース1',
        description: '説明1',
        precondition: '事前条件1',
        expectedResult: '期待結果1',
        checkpoint: null,
        scenario: null,
        testEnvironment: null,
        notes: null,
        priority: 'HIGH',
        testType: 'FUNCTIONAL',
        testTechnique: 'EQUIVALENCE',
        classification: null,
        estimatedTime: null,
        tags: ['tag1'],
        sectionName: 'セクション1',
        sectionPath: 'セクション1',
        createdAt: '2024-01-01T00:00:00.000Z',
        updatedAt: '2024-01-01T00:00:00.000Z',
        steps: [{ stepNo: 1, action: '操作1', expected: '期待1' }],
      },
      {
        id: '2',
        testCaseNumber: 'TC-0002',
        referenceId: null,
        title: 'テストケース2',
        description: '説明2',
        precondition: null,
        expectedResult: '期待結果2',
        checkpoint: null,
        scenario: null,
        testEnvironment: null,
        notes: null,
        priority: 'MEDIUM',
        testType: 'FUNCTIONAL',
        testTechnique: null,
        classification: null,
        estimatedTime: null,
        tags: [],
        sectionName: null,
        sectionPath: '',
        createdAt: '2024-01-02T00:00:00.000Z',
        updatedAt: '2024-01-02T00:00:00.000Z',
        steps: [],
      },
    ];

    it('should generate Excel with summary sheet', () => {
      const wb = generateTestSpecExcel('テスト仕様書', mockTestCases, {
        includeSummary: true,
      });

      expect(wb.SheetNames).toContain('サマリー');
      expect(wb.SheetNames).toContain('テストケース');
    });

    it('should generate Excel without summary sheet when disabled', () => {
      const wb = generateTestSpecExcel('テスト仕様書', mockTestCases, {
        includeSummary: false,
      });

      expect(wb.SheetNames).not.toContain('サマリー');
      expect(wb.SheetNames).toContain('テストケース');
    });

    it('should include test cases data', () => {
      const wb = generateTestSpecExcel('テスト仕様書', mockTestCases);
      const ws = wb.Sheets['テストケース'];

      // Check that data exists (header in row 1, first data in row 2)
      expect(ws['A1']).toBeDefined(); // Header
      expect(ws['A2']).toBeDefined(); // First data row
    });

    it('should include test steps when enabled', () => {
      const wb = generateTestSpecExcel('テスト仕様書', mockTestCases, {
        includeSteps: true,
      });
      const ws = wb.Sheets['テストケース'];

      // Find step columns in header
      const headers: string[] = [];
      let col = 0;
      while (ws[cellRef(0, col)]) {
        headers.push(ws[cellRef(0, col)].v);
        col++;
      }

      expect(headers.some((h) => h.includes('手順'))).toBe(true);
    });
  });
});
