/**
 * テストケースインポート API
 * POST /api/test-specs/[id]/import
 * CSV/Excelファイルからテストケースをインポート
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  testSpecExists,
  isTestSpecLocked,
  sectionExists,
  createTestCase,
} from '@/lib/repositories/test-case-repository';
import { createTestStep } from '@/lib/repositories/test-step-repository';
import {
  parseCsv,
  parseExcel,
  autoDetectMapping,
  validateMapping,
  convertCsvToTestCases,
  detectStepColumns,
  extractSteps,
  csvToObjects,
  generateCsvPreview,
  generateExcelPreview,
  isExcelFile,
} from '@/lib/import';
import type { FieldMapping, ImportValidationResult, CsvParseResult } from '@/lib/import';
import { findOrCreateSection } from '@/lib/repositories/test-section-repository';
import { logTestCaseCreate } from '@/lib/audit';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/test-specs/[id]/import - CSVインポート
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId } = await params;

    if (!testSpecId) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    // テスト仕様書の存在確認
    const exists = await testSpecExists(BigInt(testSpecId));
    if (!exists) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    // ロック状態確認
    const locked = await isTestSpecLocked(BigInt(testSpecId));
    if (locked) {
      return NextResponse.json(
        { error: 'ロックされているテスト仕様書にインポートできません。' },
        { status: 403 }
      );
    }

    const contentType = request.headers.get('content-type') || '';

    // マルチパートフォームデータの場合
    if (contentType.includes('multipart/form-data')) {
      const formData = await request.formData();
      const file = formData.get('file') as File | null;
      const action = formData.get('action') as string | null;
      const mappingsJson = formData.get('mappings') as string | null;
      const sectionId = formData.get('sectionId') as string | null;
      const sheetName = formData.get('sheetName') as string | null;

      if (!file) {
        return NextResponse.json({ error: 'ファイルが必要です。' }, { status: 400 });
      }

      // ファイルタイプチェック
      const fileName = file.name.toLowerCase();
      const isCsv = fileName.endsWith('.csv');
      const isExcel = isExcelFile(fileName);

      if (!isCsv && !isExcel) {
        return NextResponse.json(
          { error: 'CSVまたはExcelファイル(.xlsx, .xls, .xlsm)のみサポートされています。' },
          { status: 400 }
        );
      }

      // ファイルサイズチェック (10MB制限)
      if (file.size > 10 * 1024 * 1024) {
        return NextResponse.json({ error: 'ファイルサイズは10MBまでです。' }, { status: 400 });
      }

      // ファイルをパース
      let parseResult: CsvParseResult;
      let availableSheets: string[] = [];
      let currentSheetName = '';
      const fileType = isExcel ? 'Excel' : 'CSV';

      if (isExcel) {
        const buffer = await file.arrayBuffer();
        const excelResult = parseExcel(buffer, { sheetName: sheetName || undefined });
        parseResult = excelResult;
        availableSheets = excelResult.availableSheets;
        currentSheetName = excelResult.sheetName;
      } else {
        const content = await file.text();
        parseResult = parseCsv(content);
      }

      if (parseResult.errors.length > 0 && parseResult.rows.length === 0) {
        return NextResponse.json(
          {
            error: `${fileType}のパースに失敗しました。`,
            parseErrors: parseResult.errors,
          },
          { status: 400 }
        );
      }

      // プレビューアクション - マッピングを検出して返す
      if (action === 'preview' || !action) {
        const autoMappings = autoDetectMapping(parseResult.headers);
        const stepColumns = detectStepColumns(parseResult.headers);

        if (isExcel) {
          const preview = generateExcelPreview(
            { ...parseResult, sheetName: currentSheetName, availableSheets },
            5
          );
          return NextResponse.json({
            headers: parseResult.headers,
            preview: preview.previewRows,
            totalRows: preview.totalRows,
            autoMappings,
            stepColumns,
            parseErrors: parseResult.errors,
            fileType: 'excel',
            sheetName: currentSheetName,
            availableSheets,
          });
        } else {
          const preview = generateCsvPreview(parseResult, 5);
          return NextResponse.json({
            headers: parseResult.headers,
            preview: preview.previewRows,
            totalRows: preview.totalRows,
            autoMappings,
            stepColumns,
            parseErrors: parseResult.errors,
            fileType: 'csv',
          });
        }
      }

      // バリデーションアクション - マッピングを使ってデータを検証
      if (action === 'validate') {
        if (!mappingsJson) {
          return NextResponse.json({ error: 'マッピング設定が必要です。' }, { status: 400 });
        }

        const mappings: FieldMapping[] = JSON.parse(mappingsJson);
        const mappingValidation = validateMapping(mappings);

        if (!mappingValidation.valid) {
          return NextResponse.json(
            {
              error: 'マッピング設定が無効です。',
              mappingErrors: mappingValidation.errors,
            },
            { status: 400 }
          );
        }

        const validationResults = convertCsvToTestCases(parseResult, mappings);
        const stepColumns = detectStepColumns(parseResult.headers);

        // ステップデータを抽出
        const objects = csvToObjects(parseResult);
        validationResults.forEach((result, index) => {
          const row = objects[index];
          if (result.valid && result.data && stepColumns.stepMappings.length > 0 && row) {
            result.data.steps = extractSteps(row, stepColumns.stepMappings);
          }
        });

        const validCount = validationResults.filter((r) => r.valid).length;
        const invalidCount = validationResults.filter((r) => !r.valid).length;

        return NextResponse.json({
          validCount,
          invalidCount,
          totalCount: validationResults.length,
          validationResults: validationResults.map((r) => ({
            row: r.row,
            valid: r.valid,
            errors: r.errors,
            data: r.valid ? { title: r.data?.title, sectionName: r.data?.sectionName } : undefined,
          })),
        });
      }

      // インポート実行アクション
      if (action === 'import') {
        if (!mappingsJson) {
          return NextResponse.json({ error: 'マッピング設定が必要です。' }, { status: 400 });
        }

        const mappings: FieldMapping[] = JSON.parse(mappingsJson);
        const mappingValidation = validateMapping(mappings);

        if (!mappingValidation.valid) {
          return NextResponse.json(
            {
              error: 'マッピング設定が無効です。',
              mappingErrors: mappingValidation.errors,
            },
            { status: 400 }
          );
        }

        // セクションの存在確認（指定されている場合）
        let targetSectionId: bigint | null = null;
        if (sectionId && sectionId !== 'null') {
          const sectionExistsResult = await sectionExists(BigInt(testSpecId), BigInt(sectionId));
          if (!sectionExistsResult) {
            return NextResponse.json({ error: 'セクションが見つかりません。' }, { status: 404 });
          }
          targetSectionId = BigInt(sectionId);
        }

        const validationResults = convertCsvToTestCases(parseResult, mappings);
        const stepColumns = detectStepColumns(parseResult.headers);
        const objects = csvToObjects(parseResult);

        // ステップデータを抽出
        validationResults.forEach((result, index) => {
          const row = objects[index];
          if (result.valid && result.data && stepColumns.stepMappings.length > 0 && row) {
            result.data.steps = extractSteps(row, stepColumns.stepMappings);
          }
        });

        // インポート実行
        const importResults = await executeImport(
          testSpecId,
          targetSectionId,
          validationResults,
          session.user.id,
          isExcel ? 'Excel' : 'CSV'
        );

        return NextResponse.json(importResults);
      }

      return NextResponse.json({ error: 'サポートされていないアクションです。' }, { status: 400 });
    }

    // JSONボディの場合（直接インポート）
    if (contentType.includes('application/json')) {
      const body = await request.json();
      const { csvContent, mappings, sectionId } = body;

      if (!csvContent) {
        return NextResponse.json({ error: 'CSVコンテンツが必要です。' }, { status: 400 });
      }

      const parseResult = parseCsv(csvContent);

      if (!mappings) {
        // マッピングがない場合は自動検出してプレビュー
        const autoMappings = autoDetectMapping(parseResult.headers);
        const stepColumns = detectStepColumns(parseResult.headers);
        const preview = generateCsvPreview(parseResult, 5);

        return NextResponse.json({
          headers: parseResult.headers,
          preview: preview.previewRows,
          totalRows: preview.totalRows,
          autoMappings,
          stepColumns,
          parseErrors: parseResult.errors,
        });
      }

      // マッピングありの場合はインポート実行
      const mappingValidation = validateMapping(mappings);

      if (!mappingValidation.valid) {
        return NextResponse.json(
          {
            error: 'マッピング設定が無効です。',
            mappingErrors: mappingValidation.errors,
          },
          { status: 400 }
        );
      }

      // セクションの存在確認（指定されている場合）
      let targetSectionId: bigint | null = null;
      if (sectionId && sectionId !== 'null') {
        const sectionExistsResult = await sectionExists(BigInt(testSpecId), BigInt(sectionId));
        if (!sectionExistsResult) {
          return NextResponse.json({ error: 'セクションが見つかりません。' }, { status: 404 });
        }
        targetSectionId = BigInt(sectionId);
      }

      const validationResults = convertCsvToTestCases(parseResult, mappings);
      const stepColumns = detectStepColumns(parseResult.headers);
      const objects = csvToObjects(parseResult);

      // ステップデータを抽出
      validationResults.forEach((result, index) => {
        const row = objects[index];
        if (result.valid && result.data && stepColumns.stepMappings.length > 0 && row) {
          result.data.steps = extractSteps(row, stepColumns.stepMappings);
        }
      });

      // インポート実行
      const importResults = await executeImport(
        testSpecId,
        targetSectionId,
        validationResults,
        session.user.id,
        'CSV'
      );

      return NextResponse.json(importResults);
    }

    return NextResponse.json(
      { error: 'サポートされていないコンテンツタイプです。' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Import test cases error:', error);
    return NextResponse.json(
      { error: 'テストケースのインポートに失敗しました。' },
      { status: 500 }
    );
  }
}

/**
 * インポート実行
 */
async function executeImport(
  testSpecId: string,
  targetSectionId: bigint | null,
  validationResults: ImportValidationResult[],
  userId: string,
  importSource: 'CSV' | 'Excel' = 'CSV'
): Promise<{
  success: number;
  failed: number;
  errors: Array<{ row: number; errors: Array<{ field: string; message: string }> }>;
  createdIds: string[];
}> {
  const errors: Array<{ row: number; errors: Array<{ field: string; message: string }> }> = [];
  const createdIds: string[] = [];
  let success = 0;
  let failed = 0;

  // セクション名からIDへのキャッシュ
  const sectionCache = new Map<string, bigint>();

  for (const result of validationResults) {
    if (!result.valid || !result.data) {
      failed++;
      errors.push({ row: result.row, errors: result.errors });
      continue;
    }

    try {
      const data = result.data;
      let sectionId = targetSectionId;

      // セクション名が指定されている場合はセクションを検索または作成
      if (data.sectionName && !targetSectionId) {
        const cached = sectionCache.get(data.sectionName);
        if (cached) {
          sectionId = cached;
        } else {
          const section = await findOrCreateSection(BigInt(testSpecId), data.sectionName);
          const sectionIdBigInt = BigInt(section.id);
          sectionId = sectionIdBigInt;
          sectionCache.set(data.sectionName, sectionIdBigInt);
        }
      }

      // テストケースを作成
      const testCase = await createTestCase({
        testSpecId,
        sectionId: sectionId ? sectionId.toString() : null,
        title: data.title,
        description: data.description ?? null,
        preconditions: data.preconditions ?? null,
        expectedResult: data.expectedResult ?? null,
        checkpoint: data.checkpoint ?? null,
        scenario: data.scenario ?? null,
        testEnvironment: data.testEnvironment ?? null,
        notes: data.notes ?? null,
        tags: data.tags ?? [],
        classification: data.classification ?? null,
        referenceId: data.referenceId ?? null,
        estimatedTime: data.estimatedTime ?? null,
        priority: data.priority ?? 'MEDIUM',
        testType: data.testType,
        testTechnique: data.testTechnique,
        isMatrix: false,
      });

      // テスト手順を作成
      if (data.steps && data.steps.length > 0) {
        for (const step of data.steps) {
          await createTestStep({
            testCaseId: testCase.id,
            stepNo: step.stepNo,
            actionMd: step.action,
            expectedMd: step.expected ?? null,
          });
        }
      }

      // 監査ログ
      await logTestCaseCreate(userId, testCase.id, {
        testSpecId,
        sectionId: testCase.sectionId,
        title: testCase.title,
        priority: testCase.priority,
        testType: testCase.testType,
        importedFrom: importSource,
      });

      createdIds.push(testCase.id);
      success++;
    } catch (error) {
      console.error(`Import error at row ${result.row}:`, error);
      failed++;
      errors.push({
        row: result.row,
        errors: [
          {
            field: 'general',
            message: error instanceof Error ? error.message : 'インポートに失敗しました。',
          },
        ],
      });
    }
  }

  return { success, failed, errors, createdIds };
}
