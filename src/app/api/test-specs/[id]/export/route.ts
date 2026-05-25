/**
 * テストケースエクスポート API
 * GET /api/test-specs/[id]/export
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTestCasesForExport, testSpecExists } from '@/lib/repositories/test-case-repository';
import { generateCsv, createCsvResponse, generateExportFilename } from '@/lib/export/csv';
import {
  DEFAULT_COLUMNS,
  getColumnsByKeys,
  getColumnsWithSteps,
  getMaxStepCount,
} from '@/lib/export/test-case-export';
import type { TestCasePriority, TestType, TestTechnique } from '@/types/test-case';

export async function GET(request: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: testSpecId } = await params;

    // テスト仕様書の存在確認
    const exists = await testSpecExists(BigInt(testSpecId));
    if (!exists) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    const { searchParams } = new URL(request.url);

    // パラメータ取得
    const format = searchParams.get('format') || 'csv';
    const sectionId = searchParams.get('sectionId');
    const priority = searchParams.get('priority') as TestCasePriority | null;
    const testType = searchParams.get('testType') as TestType | null;
    const testTechnique = searchParams.get('testTechnique') as TestTechnique | null;
    const isMatrixParam = searchParams.get('isMatrix');
    const tagsParam = searchParams.get('tags');
    const classification = searchParams.get('classification');
    const includeStepsParam = searchParams.get('includeSteps');
    const columnsParam = searchParams.get('columns');
    const filenamePrefix = searchParams.get('filename') || 'test_cases';

    // フィルタパラメータを構築
    const exportParams = {
      testSpecId,
      sectionId: sectionId === 'null' ? null : (sectionId ?? undefined),
      priority: priority || undefined,
      testType: testType || undefined,
      testTechnique: testTechnique || undefined,
      isMatrix: isMatrixParam === 'true' ? true : isMatrixParam === 'false' ? false : undefined,
      tags: tagsParam ? tagsParam.split(',').filter(Boolean) : undefined,
      classification: classification || undefined,
      includeSteps: includeStepsParam !== 'false', // デフォルトでtrue
    };

    // テストケースデータを取得
    const testCases = await getTestCasesForExport(exportParams);

    if (testCases.length === 0) {
      return NextResponse.json(
        { error: 'エクスポートするテストケースがありません。' },
        { status: 404 }
      );
    }

    // CSVエクスポートの場合
    if (format === 'csv') {
      // カラムを決定
      let columnKeys: string[];
      if (columnsParam) {
        columnKeys = columnsParam.split(',').filter(Boolean);
      } else {
        // デフォルトカラムを使用（メタデータ含む）
        columnKeys = DEFAULT_COLUMNS;
      }

      let columns = getColumnsByKeys(columnKeys);

      // カラムが空の場合はデフォルトカラムを使用
      if (columns.length === 0) {
        columns = getColumnsByKeys(DEFAULT_COLUMNS);
      }

      // ステップを含める場合は動的にカラムを追加
      if (exportParams.includeSteps) {
        const maxSteps = getMaxStepCount(testCases);
        if (maxSteps > 0) {
          columns = getColumnsWithSteps(columns, maxSteps);
        }
      }

      // CSV生成
      const csvContent = generateCsv(testCases, columns, {
        bom: true,
        lineEnding: '\r\n', // Windows互換
      });

      // ファイル名生成
      const filename = generateExportFilename(filenamePrefix, 'csv');

      return createCsvResponse(csvContent, filename);
    }

    // JSON形式の場合
    if (format === 'json') {
      return NextResponse.json({
        testCases,
        total: testCases.length,
        exportedAt: new Date().toISOString(),
      });
    }

    return NextResponse.json({ error: 'サポートされていないフォーマットです。' }, { status: 400 });
  } catch (error) {
    console.error('Export test cases error:', error);
    return NextResponse.json(
      { error: 'テストケースのエクスポートに失敗しました。' },
      { status: 500 }
    );
  }
}
