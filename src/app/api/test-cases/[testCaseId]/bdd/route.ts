/**
 * BDD Test Case API
 *
 * テストケースのBDD/Gherkin記法管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { GherkinLanguage } from '@/generated/prisma';
import {
  getBddTestCase,
  upsertBddTestCase,
  deleteBddTestCase,
  hasBddTestCase,
} from '@/repositories/bdd-repository';
import {
  parseGherkin,
  serializeGherkin,
  formatGherkin,
  validateGherkin,
} from '@/lib/gherkin-parser';

interface RouteParams {
  params: Promise<{ testCaseId: string }>;
}

/**
 * GET /api/test-cases/[testCaseId]/bdd
 * BDDテストケースを取得
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { testCaseId } = await params;
    const testCaseIdBigInt = BigInt(testCaseId);

    const bddTestCase = await getBddTestCase(testCaseIdBigInt);

    if (!bddTestCase) {
      return NextResponse.json(
        { error: 'BDDテストケースが見つかりません', hasBdd: false },
        { status: 404 }
      );
    }

    return NextResponse.json({
      ...bddTestCase,
      id: bddTestCase.id.toString(),
      testCaseId: bddTestCase.testCaseId.toString(),
    });
  } catch (error) {
    console.error('Failed to fetch BDD test case:', error);
    return NextResponse.json({ error: 'BDDテストケースの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/test-cases/[testCaseId]/bdd
 * BDDテストケースを作成または更新
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { testCaseId } = await params;
    const testCaseIdBigInt = BigInt(testCaseId);
    const body = await request.json();

    const { gherkinText, language = 'JA' } = body;

    if (!gherkinText?.trim()) {
      return NextResponse.json({ error: 'Gherkinテキストは必須です' }, { status: 400 });
    }

    // 言語のバリデーション
    if (!['EN', 'JA'].includes(language)) {
      return NextResponse.json(
        { error: '無効な言語です。ENまたはJAを指定してください' },
        { status: 400 }
      );
    }

    const bddTestCase = await upsertBddTestCase({
      testCaseId: testCaseIdBigInt,
      gherkinText,
      language: language as GherkinLanguage,
    });

    return NextResponse.json({
      ...bddTestCase,
      id: bddTestCase.id.toString(),
      testCaseId: bddTestCase.testCaseId.toString(),
    });
  } catch (error) {
    console.error('Failed to create/update BDD test case:', error);
    return NextResponse.json(
      { error: 'BDDテストケースの作成/更新に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/test-cases/[testCaseId]/bdd
 * BDDテストケースを削除
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const { testCaseId } = await params;
    const testCaseIdBigInt = BigInt(testCaseId);

    const exists = await hasBddTestCase(testCaseIdBigInt);
    if (!exists) {
      return NextResponse.json({ error: 'BDDテストケースが見つかりません' }, { status: 404 });
    }

    await deleteBddTestCase(testCaseIdBigInt);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete BDD test case:', error);
    return NextResponse.json({ error: 'BDDテストケースの削除に失敗しました' }, { status: 500 });
  }
}

/**
 * PUT /api/test-cases/[testCaseId]/bdd
 * Gherkinテキストを操作（パース、フォーマット、バリデーション）
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { testCaseId: _testCaseId } = await params;
    const body = await request.json();

    const { action, gherkinText, language = 'ja' } = body;

    const langKey = language === 'JA' || language === 'ja' ? 'ja' : 'en';

    switch (action) {
      case 'parse': {
        // Gherkinテキストをパース
        const document = parseGherkin(gherkinText || '', langKey);
        return NextResponse.json({
          document,
          isValid: document.errors.length === 0,
        });
      }

      case 'format': {
        // Gherkinテキストを整形
        const formatted = formatGherkin(gherkinText || '', langKey);
        return NextResponse.json({ formatted });
      }

      case 'validate': {
        // Gherkinテキストを検証
        const document = parseGherkin(gherkinText || '', langKey);
        const errors = validateGherkin(document);
        return NextResponse.json({
          isValid: errors.length === 0,
          errors,
        });
      }

      case 'serialize': {
        // パース済みドキュメントをテキストに変換
        const { document } = body;
        if (!document) {
          return NextResponse.json({ error: 'documentは必須です' }, { status: 400 });
        }
        const serialized = serializeGherkin(document);
        return NextResponse.json({ gherkinText: serialized });
      }

      default:
        return NextResponse.json(
          {
            error:
              '不明なアクションです。parse, format, validate, serializeのいずれかを指定してください',
          },
          { status: 400 }
        );
    }
  } catch (error) {
    console.error('Failed to process Gherkin:', error);
    return NextResponse.json({ error: 'Gherkin処理に失敗しました' }, { status: 500 });
  }
}
