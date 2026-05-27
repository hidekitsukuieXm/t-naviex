/**
 * Smart Test Selection API
 *
 * GET /api/projects/[id]/smart-selection - 変更セット一覧取得
 * POST /api/projects/[id]/smart-selection - 変更セット作成
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  createChangeSet,
  getChangeSets,
  selectTestCases,
  getRecommendedTestSets,
} from '@/repositories/smart-test-selection-repository';
import { validateChangeSet } from '@/types/smart-test-selection';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/projects/[id]/smart-selection
 * 変更セット一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const projectId = id;
    const { searchParams } = new URL(request.url);

    const type = searchParams.get('type');

    if (type === 'recommended-sets') {
      // 推奨テストセット一覧を取得
      const limit = parseInt(searchParams.get('limit') || '50', 10);
      const offset = parseInt(searchParams.get('offset') || '0', 10);

      const { sets, total } = await getRecommendedTestSets(projectId, { limit, offset });

      return NextResponse.json({
        sets,
        total,
        limit,
        offset,
      });
    }

    // 変更セット一覧を取得
    const limit = parseInt(searchParams.get('limit') || '50', 10);
    const offset = parseInt(searchParams.get('offset') || '0', 10);

    const { changeSets, total } = await getChangeSets(projectId, { limit, offset });

    return NextResponse.json({
      changeSets,
      total,
      limit,
      offset,
    });
  } catch (error) {
    console.error('Failed to get smart selection data:', error);
    return NextResponse.json(
      { error: 'スマートテスト選択データの取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/projects/[id]/smart-selection
 * 変更セットを作成または選択を実行
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const projectId = id;
    const body = await request.json();
    const { action } = body;

    if (action === 'select') {
      // テストケース選択を実行
      const { changeSetId, options } = body;

      if (!changeSetId) {
        return NextResponse.json({ error: '変更セットIDは必須です' }, { status: 400 });
      }

      const result = await selectTestCases(projectId, changeSetId, options);

      return NextResponse.json(result);
    }

    // 変更セットを作成
    const { name, description, changes, scope, metadata } = body;

    // バリデーション
    const validation = validateChangeSet({ name, description, changes, scope, metadata });
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    const changeSet = await createChangeSet(projectId, {
      name,
      description,
      changes,
      scope,
      metadata,
    });

    return NextResponse.json(changeSet, { status: 201 });
  } catch (error) {
    console.error('Failed to create change set:', error);
    return NextResponse.json({ error: '変更セットの作成に失敗しました' }, { status: 500 });
  }
}
