/**
 * Excel パースユーティリティ
 */

import * as XLSX from 'xlsx';
import type { CsvParseResult, CsvParseError, CsvRow } from './csv-parser';

// ============================================
// Types
// ============================================

export interface ExcelParseOptions {
  sheetIndex?: number;
  sheetName?: string;
  skipEmptyRows?: boolean;
  header?: boolean;
  trimFields?: boolean;
}

export interface ExcelParseResult extends CsvParseResult {
  sheetName: string;
  availableSheets: string[];
}

export interface ExcelFileInfo {
  sheets: Array<{
    name: string;
    rowCount: number;
    columnCount: number;
  }>;
}

// ============================================
// Constants
// ============================================

const DEFAULT_OPTIONS: Required<Omit<ExcelParseOptions, 'sheetName'>> = {
  sheetIndex: 0,
  skipEmptyRows: true,
  header: true,
  trimFields: true,
};

// ============================================
// Excel Parser
// ============================================

/**
 * ExcelファイルをパースしてCsvParseResult互換のデータを返す
 */
export function parseExcel(buffer: ArrayBuffer, options: ExcelParseOptions = {}): ExcelParseResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: CsvParseError[] = [];

  try {
    // ワークブックを読み込み
    const workbook = XLSX.read(buffer, { type: 'array' });
    const availableSheets = workbook.SheetNames;

    if (availableSheets.length === 0) {
      errors.push({ line: 0, message: 'Excelファイルにシートがありません。' });
      return {
        headers: [],
        rows: [],
        errors,
        sheetName: '',
        availableSheets: [],
      };
    }

    // シートを選択
    let sheetName: string;
    if (opts.sheetName && availableSheets.includes(opts.sheetName)) {
      sheetName = opts.sheetName;
    } else if (opts.sheetIndex < availableSheets.length) {
      sheetName = availableSheets[opts.sheetIndex];
    } else {
      sheetName = availableSheets[0];
    }

    const worksheet = workbook.Sheets[sheetName];

    // シートをJSON形式で取得（ヘッダーなしの2D配列として）
    const rawData = XLSX.utils.sheet_to_json<string[]>(worksheet, {
      header: 1,
      defval: '',
      blankrows: false,
    });

    if (rawData.length === 0) {
      return {
        headers: [],
        rows: [],
        errors,
        sheetName,
        availableSheets,
      };
    }

    // ヘッダーとデータを分離
    let headers: string[] = [];
    let dataRows: string[][] = [];

    if (opts.header) {
      // 最初の行をヘッダーとして使用
      headers = (rawData[0] || []).map((h) => {
        const value = String(h ?? '');
        return opts.trimFields ? value.trim() : value;
      });
      dataRows = rawData.slice(1);
    } else {
      dataRows = rawData;
    }

    // データ行を処理
    const rows: string[][] = [];
    let lineNumber = opts.header ? 2 : 1; // 1-indexed

    for (const rawRow of dataRows) {
      // 空行のスキップ
      if (opts.skipEmptyRows) {
        const isEmptyRow = rawRow.every((cell) => {
          const value = String(cell ?? '');
          return value.trim() === '';
        });
        if (isEmptyRow) {
          lineNumber++;
          continue;
        }
      }

      // セルを処理
      let row = rawRow.map((cell) => {
        let value = String(cell ?? '');
        if (opts.trimFields) {
          value = value.trim();
        }
        return value;
      });

      // 列数を調整（ヘッダーの列数に合わせる）
      if (opts.header && headers.length > 0) {
        while (row.length < headers.length) {
          row.push('');
        }
        if (row.length > headers.length) {
          errors.push({
            line: lineNumber,
            message: `列数が一致しません。期待: ${headers.length}, 実際: ${row.length}`,
          });
          // ヘッダーの列数に切り詰める
          row = row.slice(0, headers.length);
        }
      }

      rows.push(row);
      lineNumber++;
    }

    return {
      headers,
      rows,
      errors,
      sheetName,
      availableSheets,
    };
  } catch (error) {
    errors.push({
      line: 0,
      message: error instanceof Error ? error.message : 'Excelファイルの解析に失敗しました。',
    });
    return {
      headers: [],
      rows: [],
      errors,
      sheetName: '',
      availableSheets: [],
    };
  }
}

/**
 * Excelファイルを読み込んでパース
 */
export async function parseExcelFile(
  file: File,
  options: ExcelParseOptions = {}
): Promise<ExcelParseResult> {
  const buffer = await file.arrayBuffer();
  return parseExcel(buffer, options);
}

/**
 * Excelファイルの情報を取得
 */
export function getExcelFileInfo(buffer: ArrayBuffer): ExcelFileInfo {
  try {
    const workbook = XLSX.read(buffer, { type: 'array' });

    const sheets = workbook.SheetNames.map((name) => {
      const worksheet = workbook.Sheets[name];
      const range = XLSX.utils.decode_range(worksheet['!ref'] || 'A1');

      return {
        name,
        rowCount: range.e.r - range.s.r + 1,
        columnCount: range.e.c - range.s.c + 1,
      };
    });

    return { sheets };
  } catch {
    return { sheets: [] };
  }
}

/**
 * パース結果をオブジェクト配列に変換
 */
export function excelToObjects(parseResult: ExcelParseResult): CsvRow[] {
  const { headers, rows } = parseResult;

  return rows.map((row) => {
    const obj: CsvRow = {};
    headers.forEach((header, index) => {
      obj[header] = row[index] ?? '';
    });
    return obj;
  });
}

/**
 * Excelデータのプレビューを生成
 */
export function generateExcelPreview(
  parseResult: ExcelParseResult,
  maxRows: number = 5
): {
  headers: string[];
  previewRows: string[][];
  totalRows: number;
  sheetName: string;
  availableSheets: string[];
} {
  return {
    headers: parseResult.headers,
    previewRows: parseResult.rows.slice(0, maxRows),
    totalRows: parseResult.rows.length,
    sheetName: parseResult.sheetName,
    availableSheets: parseResult.availableSheets,
  };
}

/**
 * Excelファイルかどうかを判定
 */
export function isExcelFile(filename: string): boolean {
  const ext = filename.toLowerCase();
  return ext.endsWith('.xlsx') || ext.endsWith('.xls') || ext.endsWith('.xlsm');
}

/**
 * サポートされているExcel拡張子を取得
 */
export function getSupportedExcelExtensions(): string[] {
  return ['.xlsx', '.xls', '.xlsm'];
}
