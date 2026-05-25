/**
 * CSV パースユーティリティ
 */

// ============================================
// Types
// ============================================

export interface CsvParseOptions {
  delimiter?: string;
  skipEmptyLines?: boolean;
  header?: boolean;
  trimFields?: boolean;
  encoding?: string;
}

export interface CsvParseResult {
  headers: string[];
  rows: string[][];
  errors: CsvParseError[];
}

export interface CsvParseError {
  line: number;
  column?: number;
  message: string;
}

export interface CsvRow {
  [key: string]: string;
}

// ============================================
// Constants
// ============================================

const DEFAULT_OPTIONS: Required<CsvParseOptions> = {
  delimiter: ',',
  skipEmptyLines: true,
  header: true,
  trimFields: true,
  encoding: 'utf-8',
};

// UTF-8 BOM
const UTF8_BOM = '\uFEFF';

// ============================================
// CSV Parser
// ============================================

/**
 * CSVテキストをパースする
 */
export function parseCsv(content: string, options: CsvParseOptions = {}): CsvParseResult {
  const opts = { ...DEFAULT_OPTIONS, ...options };
  const errors: CsvParseError[] = [];

  // BOMを除去
  let text = content;
  if (text.startsWith(UTF8_BOM)) {
    text = text.slice(1);
  }

  // 改行を統一
  text = text.replace(/\r\n/g, '\n').replace(/\r/g, '\n');

  // 行を解析
  const allRows: string[][] = [];
  let currentLine = 1;
  let position = 0;

  while (position < text.length) {
    const { row, nextPosition, error } = parseCsvRow(text, position, opts.delimiter);

    if (error) {
      errors.push({
        line: currentLine,
        message: error,
      });
    }

    // 空行をスキップ
    if (opts.skipEmptyLines && row.length === 1 && row[0] === '') {
      position = nextPosition;
      currentLine++;
      continue;
    }

    // フィールドをトリム
    const processedRow = opts.trimFields ? row.map((field) => field.trim()) : row;
    allRows.push(processedRow);

    position = nextPosition;
    currentLine++;
  }

  // ヘッダーとデータ行を分離
  if (opts.header && allRows.length > 0) {
    const headers = allRows[0];
    const rows = allRows.slice(1);

    // 列数の一貫性をチェック
    rows.forEach((row, index) => {
      if (row.length !== headers.length) {
        errors.push({
          line: index + 2, // 1-indexed, header is line 1
          message: `列数が一致しません。期待: ${headers.length}, 実際: ${row.length}`,
        });
      }
    });

    return { headers, rows, errors };
  }

  return { headers: [], rows: allRows, errors };
}

/**
 * CSV行をパースする
 */
function parseCsvRow(
  text: string,
  startPosition: number,
  delimiter: string
): { row: string[]; nextPosition: number; error?: string } {
  const row: string[] = [];
  let position = startPosition;
  let error: string | undefined;

  while (position < text.length) {
    const char = text[position];

    // 行末
    if (char === '\n') {
      position++;
      break;
    }

    // フィールドを解析
    const { field, nextPosition, fieldError } = parseCsvField(text, position, delimiter);

    if (fieldError) {
      error = fieldError;
    }

    row.push(field);
    position = nextPosition;

    // 行末チェック
    if (position >= text.length || text[position] === '\n') {
      if (text[position] === '\n') {
        position++;
      }
      break;
    }

    // デリミタをスキップ
    if (text[position] === delimiter) {
      position++;
    }
  }

  // 末尾のデリミタの場合、空フィールドを追加
  if (text[startPosition] !== '\n' && row.length === 0) {
    row.push('');
  }

  return { row, nextPosition: position, error };
}

/**
 * CSVフィールドをパースする
 */
function parseCsvField(
  text: string,
  startPosition: number,
  delimiter: string
): { field: string; nextPosition: number; fieldError?: string } {
  let position = startPosition;
  let field = '';
  let fieldError: string | undefined;

  // 空フィールドまたは行末
  if (position >= text.length || text[position] === '\n' || text[position] === delimiter) {
    return { field: '', nextPosition: position };
  }

  // クォートされたフィールド
  if (text[position] === '"') {
    position++; // 開始クォートをスキップ
    let inQuote = true;

    while (position < text.length && inQuote) {
      const char = text[position];

      if (char === '"') {
        // エスケープされたクォートをチェック
        if (position + 1 < text.length && text[position + 1] === '"') {
          field += '"';
          position += 2;
        } else {
          // 終了クォート
          inQuote = false;
          position++;
        }
      } else {
        field += char;
        position++;
      }
    }

    if (inQuote) {
      fieldError = 'クォートが閉じていません';
    }

    return { field, nextPosition: position, fieldError };
  }

  // クォートされていないフィールド
  while (position < text.length) {
    const char = text[position];

    if (char === delimiter || char === '\n') {
      break;
    }

    field += char;
    position++;
  }

  return { field, nextPosition: position };
}

/**
 * パース結果をオブジェクト配列に変換
 */
export function csvToObjects(parseResult: CsvParseResult): CsvRow[] {
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
 * CSVファイルを読み込んでパース
 */
export async function parseCsvFile(
  file: File,
  options: CsvParseOptions = {}
): Promise<CsvParseResult> {
  const content = await file.text();
  return parseCsv(content, options);
}

/**
 * CSVヘッダーを検証
 */
export function validateCsvHeaders(
  headers: string[],
  requiredHeaders: string[]
): { valid: boolean; missing: string[]; unknown: string[] } {
  const missing = requiredHeaders.filter((h) => !headers.includes(h));
  const unknown = headers.filter((h) => !requiredHeaders.includes(h));

  return {
    valid: missing.length === 0,
    missing,
    unknown,
  };
}

/**
 * CSVデータのプレビューを生成
 */
export function generateCsvPreview(
  parseResult: CsvParseResult,
  maxRows: number = 5
): { headers: string[]; previewRows: string[][]; totalRows: number } {
  return {
    headers: parseResult.headers,
    previewRows: parseResult.rows.slice(0, maxRows),
    totalRows: parseResult.rows.length,
  };
}
