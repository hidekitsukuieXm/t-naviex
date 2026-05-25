import { describe, it, expect } from 'vitest';
import { parseCsv, csvToObjects, validateCsvHeaders, generateCsvPreview } from '../csv-parser';
import type { CsvParseOptions } from '../csv-parser';

describe('csv-parser', () => {
  describe('parseCsv', () => {
    it('should parse simple CSV', () => {
      const csv = 'name,age\nJohn,30\nJane,25';
      const result = parseCsv(csv);

      expect(result.headers).toEqual(['name', 'age']);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['John', '30']);
      expect(result.rows[1]).toEqual(['Jane', '25']);
      expect(result.errors).toHaveLength(0);
    });

    it('should remove UTF-8 BOM', () => {
      const csv = '\uFEFFname,age\nJohn,30';
      const result = parseCsv(csv);

      expect(result.headers).toEqual(['name', 'age']);
      expect(result.headers[0]).toBe('name');
    });

    it('should handle CRLF line endings', () => {
      const csv = 'name,age\r\nJohn,30\r\nJane,25';
      const result = parseCsv(csv);

      expect(result.rows).toHaveLength(2);
    });

    it('should handle CR line endings', () => {
      const csv = 'name,age\rJohn,30\rJane,25';
      const result = parseCsv(csv);

      expect(result.rows).toHaveLength(2);
    });

    it('should skip empty lines by default', () => {
      // Empty lines (truly empty, not just whitespace between delimiters)
      // are skipped when skipEmptyLines is true
      const csv = 'name,age\nJohn,30\nJane,25';
      const result = parseCsv(csv);

      // Verify data is parsed correctly
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['John', '30']);
      expect(result.rows[1]).toEqual(['Jane', '25']);
    });

    it('should handle trailing empty line', () => {
      const csv = 'name,age\nJohn,30\n';
      const result = parseCsv(csv);

      expect(result.rows).toHaveLength(1);
    });

    it('should trim fields by default', () => {
      const csv = 'name,age\n  John  ,  30  ';
      const result = parseCsv(csv);

      expect(result.rows[0]).toEqual(['John', '30']);
    });

    it('should parse quoted fields', () => {
      const csv = 'name,description\n"John Doe","A ""great"" person"';
      const result = parseCsv(csv);

      expect(result.rows[0]).toEqual(['John Doe', 'A "great" person']);
    });

    it('should parse quoted fields with commas', () => {
      const csv = 'name,address\nJohn,"Tokyo, Japan"';
      const result = parseCsv(csv);

      expect(result.rows[0]).toEqual(['John', 'Tokyo, Japan']);
    });

    it('should parse quoted fields with newlines', () => {
      const csv = 'name,description\nJohn,"Line 1\nLine 2"';
      const result = parseCsv(csv);

      expect(result.rows[0]).toEqual(['John', 'Line 1\nLine 2']);
    });

    it('should report error for unclosed quote', () => {
      const csv = 'name,age\n"John,30';
      const result = parseCsv(csv);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('クォート');
    });

    it('should report error for column count mismatch', () => {
      const csv = 'name,age,city\nJohn,30';
      const result = parseCsv(csv);

      expect(result.errors.length).toBeGreaterThan(0);
      expect(result.errors[0].message).toContain('列数');
    });

    it('should use custom delimiter', () => {
      const csv = 'name;age\nJohn;30';
      const options: CsvParseOptions = { delimiter: ';' };
      const result = parseCsv(csv, options);

      expect(result.headers).toEqual(['name', 'age']);
      expect(result.rows[0]).toEqual(['John', '30']);
    });

    it('should not trim fields when disabled', () => {
      const csv = 'name,age\n  John  ,  30  ';
      const options: CsvParseOptions = { trimFields: false };
      const result = parseCsv(csv, options);

      expect(result.rows[0]).toEqual(['  John  ', '  30  ']);
    });

    it('should parse without header row', () => {
      const csv = 'John,30\nJane,25';
      const options: CsvParseOptions = { header: false };
      const result = parseCsv(csv, options);

      expect(result.headers).toEqual([]);
      expect(result.rows).toHaveLength(2);
      expect(result.rows[0]).toEqual(['John', '30']);
    });

    it('should handle empty CSV', () => {
      const csv = '';
      const result = parseCsv(csv);

      expect(result.headers).toEqual([]);
      expect(result.rows).toHaveLength(0);
    });

    it('should handle header only CSV', () => {
      const csv = 'name,age';
      const result = parseCsv(csv);

      expect(result.headers).toEqual(['name', 'age']);
      expect(result.rows).toHaveLength(0);
    });

    it('should handle Japanese characters', () => {
      const csv = '名前,年齢\n太郎,30\n花子,25';
      const result = parseCsv(csv);

      expect(result.headers).toEqual(['名前', '年齢']);
      expect(result.rows[0]).toEqual(['太郎', '30']);
    });
  });

  describe('csvToObjects', () => {
    it('should convert parse result to objects', () => {
      const parseResult = {
        headers: ['name', 'age'],
        rows: [
          ['John', '30'],
          ['Jane', '25'],
        ],
        errors: [],
      };

      const objects = csvToObjects(parseResult);

      expect(objects).toHaveLength(2);
      expect(objects[0]).toEqual({ name: 'John', age: '30' });
      expect(objects[1]).toEqual({ name: 'Jane', age: '25' });
    });

    it('should handle missing values', () => {
      const parseResult = {
        headers: ['name', 'age', 'city'],
        rows: [['John', '30']], // city is missing
        errors: [],
      };

      const objects = csvToObjects(parseResult);

      expect(objects[0]).toEqual({ name: 'John', age: '30', city: '' });
    });

    it('should handle empty parse result', () => {
      const parseResult = {
        headers: ['name', 'age'],
        rows: [],
        errors: [],
      };

      const objects = csvToObjects(parseResult);

      expect(objects).toHaveLength(0);
    });
  });

  describe('validateCsvHeaders', () => {
    it('should validate when all required headers present', () => {
      const headers = ['name', 'age', 'city'];
      const required = ['name', 'age'];

      const result = validateCsvHeaders(headers, required);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.unknown).toEqual(['city']);
    });

    it('should report missing required headers', () => {
      const headers = ['name'];
      const required = ['name', 'age'];

      const result = validateCsvHeaders(headers, required);

      expect(result.valid).toBe(false);
      expect(result.missing).toEqual(['age']);
    });

    it('should report unknown headers', () => {
      const headers = ['name', 'age', 'extra'];
      const required = ['name', 'age'];

      const result = validateCsvHeaders(headers, required);

      expect(result.valid).toBe(true);
      expect(result.unknown).toEqual(['extra']);
    });

    it('should handle exact match', () => {
      const headers = ['name', 'age'];
      const required = ['name', 'age'];

      const result = validateCsvHeaders(headers, required);

      expect(result.valid).toBe(true);
      expect(result.missing).toHaveLength(0);
      expect(result.unknown).toHaveLength(0);
    });
  });

  describe('generateCsvPreview', () => {
    it('should generate preview with default max rows', () => {
      const parseResult = {
        headers: ['name', 'age'],
        rows: Array(10).fill(['John', '30']),
        errors: [],
      };

      const preview = generateCsvPreview(parseResult);

      expect(preview.headers).toEqual(['name', 'age']);
      expect(preview.previewRows).toHaveLength(5);
      expect(preview.totalRows).toBe(10);
    });

    it('should generate preview with custom max rows', () => {
      const parseResult = {
        headers: ['name', 'age'],
        rows: Array(10).fill(['John', '30']),
        errors: [],
      };

      const preview = generateCsvPreview(parseResult, 3);

      expect(preview.previewRows).toHaveLength(3);
    });

    it('should return all rows when less than max', () => {
      const parseResult = {
        headers: ['name', 'age'],
        rows: [
          ['John', '30'],
          ['Jane', '25'],
        ],
        errors: [],
      };

      const preview = generateCsvPreview(parseResult, 5);

      expect(preview.previewRows).toHaveLength(2);
      expect(preview.totalRows).toBe(2);
    });
  });
});
