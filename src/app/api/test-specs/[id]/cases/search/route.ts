import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { searchTestCases, testSpecExists } from '@/lib/repositories/test-case-repository';
import type { SearchableField } from '@/types/test-case';
import {
  ALL_SEARCHABLE_FIELDS,
  VALID_PRIORITIES,
  VALID_TEST_TYPES,
  VALID_TEST_TECHNIQUES,
} from '@/types/test-case';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/test-specs/[id]/cases/search - テストケース全文検索
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
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

    // クエリパラメータの取得
    const { searchParams } = new URL(request.url);
    const query = searchParams.get('query');
    const sectionId = searchParams.get('sectionId');
    const fieldsParam = searchParams.get('fields');
    const priority = searchParams.get('priority');
    const testType = searchParams.get('testType');
    const testTechnique = searchParams.get('testTechnique');
    const isMatrixParam = searchParams.get('isMatrix');
    const tagsParam = searchParams.get('tags');
    const classification = searchParams.get('classification');
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '20', 10);

    // 検索クエリのバリデーション
    if (!query?.trim()) {
      return NextResponse.json({ error: '検索クエリは必須です。' }, { status: 400 });
    }

    if (query.trim().length < 2) {
      return NextResponse.json(
        { error: '検索クエリは2文字以上で入力してください。' },
        { status: 400 }
      );
    }

    if (query.length > 200) {
      return NextResponse.json(
        { error: '検索クエリは200文字以内で入力してください。' },
        { status: 400 }
      );
    }

    // 検索対象フィールドをパース
    let searchFields: SearchableField[] = ALL_SEARCHABLE_FIELDS;
    if (fieldsParam) {
      const parsedFields = fieldsParam.split(',').filter((f) => f.trim());
      const validFields = parsedFields.filter((f) =>
        ALL_SEARCHABLE_FIELDS.includes(f as SearchableField)
      ) as SearchableField[];
      if (validFields.length > 0) {
        searchFields = validFields;
      }
    }

    // 優先度のバリデーション
    if (priority && !VALID_PRIORITIES.includes(priority as never)) {
      return NextResponse.json({ error: '無効な優先度です。' }, { status: 400 });
    }

    // テストタイプのバリデーション
    if (testType && !VALID_TEST_TYPES.includes(testType as never)) {
      return NextResponse.json({ error: '無効なテストタイプです。' }, { status: 400 });
    }

    // テスト技法のバリデーション
    if (testTechnique && !VALID_TEST_TECHNIQUES.includes(testTechnique as never)) {
      return NextResponse.json({ error: '無効なテスト技法です。' }, { status: 400 });
    }

    // タグをパース（カンマ区切り）
    const tags = tagsParam ? tagsParam.split(',').filter((t) => t.trim()) : undefined;

    // ページネーションのバリデーション
    if (page < 1) {
      return NextResponse.json({ error: 'ページ番号は1以上で指定してください。' }, { status: 400 });
    }

    if (limit < 1 || limit > 100) {
      return NextResponse.json(
        { error: '取得件数は1〜100の範囲で指定してください。' },
        { status: 400 }
      );
    }

    const result = await searchTestCases({
      testSpecId,
      query: query.trim(),
      sectionId: sectionId === 'null' ? null : (sectionId ?? undefined),
      searchFields,
      priority: priority as 'CRITICAL' | 'HIGH' | 'MEDIUM' | 'LOW' | undefined,
      testType: testType as
        | 'FUNCTIONAL'
        | 'INTEGRATION'
        | 'E2E'
        | 'PERFORMANCE'
        | 'SECURITY'
        | 'USABILITY'
        | 'OTHER'
        | undefined,
      testTechnique: testTechnique as
        | 'EQUIVALENCE_PARTITIONING'
        | 'BOUNDARY_VALUE_ANALYSIS'
        | 'DECISION_TABLE'
        | 'STATE_TRANSITION'
        | 'EXPLORATORY'
        | 'REGRESSION'
        | 'OTHER'
        | undefined,
      isMatrix: isMatrixParam === null ? undefined : isMatrixParam === 'true',
      tags,
      classification: classification ?? undefined,
      page,
      limit,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Search test cases error:', error);
    return NextResponse.json({ error: 'テストケースの検索に失敗しました。' }, { status: 500 });
  }
}
