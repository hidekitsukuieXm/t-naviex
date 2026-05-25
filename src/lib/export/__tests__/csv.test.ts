import { describe, it, expect } from 'vitest';
import {
  escapeCsvCell,
  createCsvRow,
  generateCsv,
  formatDate,
  formatDateLocal,
  formatArray,
  formatMultilineText,
  sanitizeFilename,
  generateExportFilename,
} from '../csv';
import type { CsvColumn } from '../csv';

describe('csv', () => {
  describe('escapeCsvCell', () => {
    it('should return empty string for null', () => {
      expect(escapeCsvCell(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(escapeCsvCell(undefined)).toBe('');
    });

    it('should return plain text without special characters', () => {
      expect(escapeCsvCell('Hello World')).toBe('Hello World');
    });

    it('should return number as string', () => {
      expect(escapeCsvCell(123)).toBe('123');
    });

    it('should escape text with comma', () => {
      expect(escapeCsvCell('Hello, World')).toBe('"Hello, World"');
    });

    it('should escape text with double quote', () => {
      expect(escapeCsvCell('Say "Hello"')).toBe('"Say ""Hello"""');
    });

    it('should escape text with newline', () => {
      expect(escapeCsvCell('Line1\nLine2')).toBe('"Line1\nLine2"');
    });

    it('should escape text with carriage return', () => {
      expect(escapeCsvCell('Line1\rLine2')).toBe('"Line1\rLine2"');
    });

    it('should escape text with multiple special characters', () => {
      expect(escapeCsvCell('Hello, "World"\nLine2')).toBe('"Hello, ""World""\nLine2"');
    });
  });

  describe('createCsvRow', () => {
    it('should create CSV row with default delimiter', () => {
      expect(createCsvRow(['A', 'B', 'C'])).toBe('A,B,C');
    });

    it('should create CSV row with custom delimiter', () => {
      expect(createCsvRow(['A', 'B', 'C'], ';')).toBe('A;B;C');
    });

    it('should handle mixed values', () => {
      expect(createCsvRow(['Text', 123, null, undefined])).toBe('Text,123,,');
    });

    it('should escape values with special characters', () => {
      expect(createCsvRow(['Hello, World', 'Plain'])).toBe('"Hello, World",Plain');
    });
  });

  describe('generateCsv', () => {
    interface TestData {
      id: number;
      name: string;
      value: number | null;
    }

    const columns: CsvColumn<TestData>[] = [
      { key: 'id', header: 'ID', getValue: (row) => row.id },
      { key: 'name', header: '名前', getValue: (row) => row.name },
      { key: 'value', header: '値', getValue: (row) => row.value },
    ];

    const testData: TestData[] = [
      { id: 1, name: 'Item 1', value: 100 },
      { id: 2, name: 'Item, with comma', value: null },
      { id: 3, name: 'Item "quoted"', value: 300 },
    ];

    it('should generate CSV with BOM and headers by default', () => {
      const csv = generateCsv(testData, columns);
      expect(csv.startsWith('\uFEFF')).toBe(true);
      expect(csv).toContain('ID,名前,値');
    });

    it('should include data rows', () => {
      const csv = generateCsv(testData, columns);
      expect(csv).toContain('1,Item 1,100');
      expect(csv).toContain('2,"Item, with comma",');
      expect(csv).toContain('3,"Item ""quoted""",300');
    });

    it('should generate CSV without BOM when disabled', () => {
      const csv = generateCsv(testData, columns, { bom: false });
      expect(csv.startsWith('\uFEFF')).toBe(false);
      expect(csv.startsWith('ID')).toBe(true);
    });

    it('should generate CSV without headers when disabled', () => {
      const csv = generateCsv(testData, columns, { includeHeaders: false });
      expect(csv).not.toContain('ID,名前,値');
      expect(csv).toContain('1,Item 1,100');
    });

    it('should use custom delimiter', () => {
      const csv = generateCsv(testData, columns, { delimiter: ';', bom: false });
      expect(csv).toContain('ID;名前;値');
      expect(csv).toContain('1;Item 1;100');
    });

    it('should use custom line ending', () => {
      const csv = generateCsv(testData, columns, { lineEnding: '\r\n', bom: false });
      expect(csv).toContain('\r\n');
    });
  });

  describe('formatDate', () => {
    it('should return empty string for null', () => {
      expect(formatDate(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatDate(undefined)).toBe('');
    });

    it('should format Date object', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      expect(formatDate(date)).toBe('2024-01-15T10:30:00.000Z');
    });

    it('should format date string', () => {
      const result = formatDate('2024-01-15T10:30:00.000Z');
      expect(result).toBe('2024-01-15T10:30:00.000Z');
    });
  });

  describe('formatDateLocal', () => {
    it('should return empty string for null', () => {
      expect(formatDateLocal(null)).toBe('');
    });

    it('should format date in Japanese locale', () => {
      const date = new Date('2024-01-15T10:30:00.000Z');
      const result = formatDateLocal(date);
      // The format depends on timezone, so we just check it contains numbers
      expect(result).toMatch(/\d{4}/); // Year
      expect(result).toMatch(/\d{2}/); // Month/Day/Hour/Minute/Second
    });
  });

  describe('formatArray', () => {
    it('should return empty string for null', () => {
      expect(formatArray(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatArray(undefined)).toBe('');
    });

    it('should return empty string for empty array', () => {
      expect(formatArray([])).toBe('');
    });

    it('should join array with default separator', () => {
      expect(formatArray(['A', 'B', 'C'])).toBe('A, B, C');
    });

    it('should join array with custom separator', () => {
      expect(formatArray(['A', 'B', 'C'], ' | ')).toBe('A | B | C');
    });
  });

  describe('formatMultilineText', () => {
    it('should return empty string for null', () => {
      expect(formatMultilineText(null)).toBe('');
    });

    it('should return empty string for undefined', () => {
      expect(formatMultilineText(undefined)).toBe('');
    });

    it('should preserve LF newlines', () => {
      expect(formatMultilineText('Line1\nLine2')).toBe('Line1\nLine2');
    });

    it('should convert CRLF to LF', () => {
      expect(formatMultilineText('Line1\r\nLine2')).toBe('Line1\nLine2');
    });

    it('should convert CR to LF', () => {
      expect(formatMultilineText('Line1\rLine2')).toBe('Line1\nLine2');
    });
  });

  describe('sanitizeFilename', () => {
    it('should return filename without special characters', () => {
      expect(sanitizeFilename('test_file')).toBe('test_file');
    });

    it('should replace special characters with underscore', () => {
      expect(sanitizeFilename('file<>:"/\\|?*.csv')).toBe('file_________.csv');
    });

    it('should trim whitespace', () => {
      expect(sanitizeFilename('  test  ')).toBe('test');
    });
  });

  describe('generateExportFilename', () => {
    it('should generate filename with date and time', () => {
      const filename = generateExportFilename('test_cases');
      expect(filename).toMatch(/^test_cases_\d{4}-\d{2}-\d{2}_\d{2}-\d{2}-\d{2}\.csv$/);
    });

    it('should use custom extension', () => {
      const filename = generateExportFilename('test_cases', 'xlsx');
      expect(filename).toMatch(/\.xlsx$/);
    });

    it('should sanitize prefix', () => {
      const filename = generateExportFilename('test:cases');
      expect(filename).toMatch(/^test_cases_/);
    });
  });
});
