/**
 * Smart Test Selection Change Set API
 *
 * GET /api/projects/[id]/smart-selection/[changeSetId] - 変更セット詳細取得
 * PUT /api/projects/[id]/smart-selection/[changeSetId] - 変更セット更新
 * DELETE /api/projects/[id]/smart-selection/[changeSetId] - 変更セット削除
 * POST /api/projects/[id]/smart-selection/[changeSetId] - アクション実行
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getChangeSet,
  updateChangeSet,
  deleteChangeSet,
  analyzeImpact,
  getImpactAnalysis,
  selectTestCases,
  generateRecommendedTestSet,
  getRecommendedTestSet,
  deleteRecommendedTestSet,
} from '@/repositories/smart-test-selection-repository';
import { SelectionStatus } from '@/types/smart-test-selection';

interface RouteParams {
  params: Promise<{ id: string; changeSetId: string }>;
}

/**
 * GET /api/projects/[id]/smart-selection/[changeSetId]
 * 変更セット詳細を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { changeSetId } = await params;
    const { searchParams } = new URL(request.url);
    const includeAnalysis = searchParams.get('includeAnalysis') === 'true';

    const changeSet = await getChangeSet(changeSetId);

    if (!changeSet) {
      return NextResponse.json({ error: '変更セットが見つかりません' }, { status: 404 });
    }

    const response: Record<string, unknown> = { ...changeSet };

    if (includeAnalysis) {
      const analysis = await getImpactAnalysis(changeSetId);
      response.analysis = analysis;
    }

    return NextResponse.json(response);
  } catch (error) {
    console.error('Failed to get change set:', error);
    return NextResponse.json({ error: '変更セットの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/smart-selection/[changeSetId]
 * 変更セットを更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { changeSetId } = await params;
    const body = await request.json();

    const changeSet = await updateChangeSet(changeSetId, body);

    if (!changeSet) {
      return NextResponse.json({ error: '変更セットが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(changeSet);
  } catch (error) {
    console.error('Failed to update change set:', error);
    return NextResponse.json({ error: '変更セットの更新に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/smart-selection/[changeSetId]
 * 変更セットを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { changeSetId } = await params;
    const { searchParams } = new URL(request.url);
    const type = searchParams.get('type');

    if (type === 'recommended-set') {
      // 推奨テストセットを削除
      await deleteRecommendedTestSet(changeSetId);
      return NextResponse.json({ success: true });
    }

    await deleteChangeSet(changeSetId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete change set:', error);
    return NextResponse.json({ error: '変更セットの削除に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/smart-selection/[changeSetId]
 * アクションを実行
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, changeSetId } = await params;
    const projectId = id;
    const body = await request.json();
    const { action } = body;

    switch (action) {
      case 'analyze': {
        // 影響分析を実行
        const { options } = body;
        const analysis = await analyzeImpact(changeSetId, options);
        return NextResponse.json(analysis);
      }

      case 'select': {
        // テストケース選択を実行
        const { options } = body;
        const result = await selectTestCases(projectId, changeSetId, options);
        return NextResponse.json(result);
      }

      case 'generate-test-set': {
        // 推奨テストセットを生成
        const { analysisId, selections, name, description } = body;

        if (!analysisId || !selections || !Array.isArray(selections)) {
          return NextResponse.json({ error: 'analysisIdとselectionsは必須です' }, { status: 400 });
        }

        const validatedSelections = selections.map(
          (s: { testCaseId: string; status?: SelectionStatus }) => ({
            testCaseId: s.testCaseId,
            status: s.status || SelectionStatus.MANUALLY_SELECTED,
          })
        );

        const testSet = await generateRecommendedTestSet(
          projectId,
          changeSetId,
          analysisId,
          validatedSelections,
          { name, description }
        );

        return NextResponse.json(testSet, { status: 201 });
      }

      case 'get-recommended-set': {
        // 推奨テストセットを取得
        const { setId } = body;

        if (!setId) {
          return NextResponse.json({ error: 'setIdは必須です' }, { status: 400 });
        }

        const set = await getRecommendedTestSet(setId);

        if (!set) {
          return NextResponse.json({ error: '推奨テストセットが見つかりません' }, { status: 404 });
        }

        return NextResponse.json(set);
      }

      default:
        return NextResponse.json({ error: '不明なアクションです' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to execute action:', error);
    return NextResponse.json({ error: 'アクションの実行に失敗しました' }, { status: 500 });
  }
}
