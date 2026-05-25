/**
 * CSV エクスポートユーティリティ
 */

// ============================================
// Types
// ============================================

export interface CsvColumn<T> {
  key: string;
  header: string;
  getValue: (row: T) => string | number | null | undefined;
  width?: number;
}

export interface CsvExportOptions {
  filename?: string;
  includeHeaders?: boolean;
  delimiter?: string;
  lineEnding?: '\n' | '\r\n';
  bom?: boolean;
}

// ============================================
// Constants
// ============================================

const DEFAULT_OPTIONS: Required<CsvExportOptions> = {
  filename: 'export.csv',
  includeHeaders: true,
  delimiter: ',',
  lineEnding: '\n',
  bom: true, // UTF-8 BOM for Excel compatibility
};

// UTF-8 BOM
const UTF8_BOM = '\uFEFF';

// ============================================
// Utility Functions
// ============================================

/**
 * 値をCSVセルとしてエスケープする
 */
export function escapeCsvCell(value: string | number | null | undefined): string {
  if (value === null || value === undefined) {
    return '';
  }

  const strValue = String(value);

  // カンマ、ダブルクォート、改行が含まれる場合はエスケープが必要
  if (
    strValue.includes(',') ||
    strValue.includes('"') ||
    strValue.includes('\n') ||
    strValue.includes('\r')
  ) {
    // ダブルクォートをエスケープ
    const escaped = strValue.replace(/"/g, '""');
    return `"${escaped}"`;
  }

  return strValue;
}

/**
 * 配列からCSV行を生成
 */
export function createCsvRow(
  values: (string | number | null | undefined)[],
  delimiter: string = ','
): string {
  return values.map(escapeCsvCell).join(delimiter);
}

/**
 * データ配列からCSVコンテンツを生成
 */
export function generateCsv<T>(
  data: T[],
  columns: CsvColumn<T>[],
  options: CsvExportOptions = {}
): string {
  const opts = { ...DEFAULT_OPTIONS, ...options };

  const rows: string[] = [];

  // ヘッダー行
  if (opts.includeHeaders) {
    const headerRow = createCsvRow(
      columns.map((col) => col.header),
      opts.delimiter
    );
    rows.push(headerRow);
  }

  // データ行
  for (const row of data) {
    const values = columns.map((col) => col.getValue(row));
    const dataRow = createCsvRow(values, opts.delimiter);
    rows.push(dataRow);
  }

  // BOM + CSV
  const csvContent = rows.join(opts.lineEnding);
  return opts.bom ? UTF8_BOM + csvContent : csvContent;
}

/**
 * CSVダウンロード用のレスポンスを生成
 */
export function createCsvResponse(csvContent: string, filename: string): Response {
  // TextEncoderを使用してUTF-8バイト配列に変換（BOMを正しく保持）
  const encoder = new TextEncoder();
  const bytes = encoder.encode(csvContent);

  return new Response(bytes, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': `attachment; filename="${encodeURIComponent(filename)}"`,
      'Cache-Control': 'no-cache',
    },
  });
}

/**
 * 日付をフォーマット（ISO形式）
 */
export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toISOString();
}

/**
 * 日付をローカルフォーマット
 */
export function formatDateLocal(date: string | Date | null | undefined): string {
  if (!date) return '';
  const d = typeof date === 'string' ? new Date(date) : date;
  return d.toLocaleString('ja-JP', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
  });
}

/**
 * 配列を文字列に変換（タグなど）
 */
export function formatArray(arr: string[] | null | undefined, separator: string = ', '): string {
  if (!arr || arr.length === 0) return '';
  return arr.join(separator);
}

/**
 * 改行を含むテキストをCSV用にフォーマット
 */
export function formatMultilineText(text: string | null | undefined): string {
  if (!text) return '';
  // Markdownの改行を通常の改行に変換
  return text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
}

/**
 * ファイル名に使用できない文字を除去
 */
export function sanitizeFilename(filename: string): string {
  return filename.replace(/[<>:"/\\|?*]/g, '_').trim();
}

/**
 * エクスポート用のファイル名を生成
 */
export function generateExportFilename(prefix: string, extension: string = 'csv'): string {
  const date = new Date().toISOString().split('T')[0];
  const time = new Date().toTimeString().split(' ')[0].replace(/:/g, '-');
  return `${sanitizeFilename(prefix)}_${date}_${time}.${extension}`;
}
