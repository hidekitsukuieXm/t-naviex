/**
 * Combinatorial Testing Definition API Routes
 *
 * 組合せテスト定義の詳細取得・更新・削除・操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getCombinatorialDefinition,
  updateCombinatorialDefinition,
  deleteCombinatorialDefinition,
  generatePairwiseCombinations,
  generateAllCombinations,
  generateOrthogonalArrayCombinations,
  generateNWiseCombinations,
  saveGenerationResult,
  getGenerationResult,
  calculateCoverage,
} from '@/repositories/combinatorial-repository';
import { CombinatorialMethod, GenerationStatistics } from '@/types/combinatorial';

interface RouteParams {
  params: Promise<{ id: string; definitionId: string }>;
}

/**
 * GET /api/projects/[id]/combinatorial/[definitionId]
 * 組合せテスト定義詳細を取得
 */
export async function GET(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { definitionId } = await params;
    const defId = parseInt(definitionId, 10);

    if (isNaN(defId)) {
      return NextResponse.json({ error: '無効な定義IDです' }, { status: 400 });
    }

    const { searchParams } = new URL(req.url);
    const includeResult = searchParams.get('includeResult') === 'true';

    const definition = await getCombinatorialDefinition(defId);

    if (!definition) {
      return NextResponse.json({ error: '定義が見つかりません' }, { status: 404 });
    }

    let result = null;
    if (includeResult) {
      result = await getGenerationResult(defId);
    }

    return NextResponse.json({ definition, result });
  } catch (error) {
    console.error('Failed to get combinatorial definition:', error);
    return NextResponse.json({ error: '組合せテスト定義の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/combinatorial/[definitionId]
 * 組合せテスト定義を更新
 */
export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { definitionId } = await params;
    const defId = parseInt(definitionId, 10);

    if (isNaN(defId)) {
      return NextResponse.json({ error: '無効な定義IDです' }, { status: 400 });
    }

    const body = await req.json();

    // 既存の定義を確認
    const existing = await getCombinatorialDefinition(defId);
    if (!existing) {
      return NextResponse.json({ error: '定義が見つかりません' }, { status: 404 });
    }

    // バリデーション
    if (body.parameters && body.parameters.length < 2) {
      return NextResponse.json({ error: 'パラメータを2つ以上設定してください' }, { status: 400 });
    }

    if (body.method === 'N_WISE' && (!body.nWiseLevel || body.nWiseLevel < 2)) {
      return NextResponse.json(
        { error: 'N-wiseのレベルは2以上を指定してください' },
        { status: 400 }
      );
    }

    const definition = await updateCombinatorialDefinition(defId, {
      name: body.name,
      description: body.description,
      parameters: body.parameters,
      method: body.method,
      nWiseLevel: body.nWiseLevel,
      constraints: body.constraints,
      metadata: body.metadata,
    });

    return NextResponse.json(definition);
  } catch (error) {
    console.error('Failed to update combinatorial definition:', error);

    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: '同じ名前の定義が既に存在します' }, { status: 409 });
    }

    return NextResponse.json({ error: '組合せテスト定義の更新に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/combinatorial/[definitionId]
 * 組合せテスト定義を削除
 */
export async function DELETE(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { definitionId } = await params;
    const defId = parseInt(definitionId, 10);

    if (isNaN(defId)) {
      return NextResponse.json({ error: '無効な定義IDです' }, { status: 400 });
    }

    // 既存の定義を確認
    const existing = await getCombinatorialDefinition(defId);
    if (!existing) {
      return NextResponse.json({ error: '定義が見つかりません' }, { status: 404 });
    }

    await deleteCombinatorialDefinition(defId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete combinatorial definition:', error);
    return NextResponse.json({ error: '組合せテスト定義の削除に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/combinatorial/[definitionId]
 * 組合せテスト定義に対する操作（組合せ生成など）
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { definitionId } = await params;
    const defId = parseInt(definitionId, 10);

    if (isNaN(defId)) {
      return NextResponse.json({ error: '無効な定義IDです' }, { status: 400 });
    }

    const body = await req.json();
    const action = body.action;

    // 定義を取得
    const definition = await getCombinatorialDefinition(defId);
    if (!definition) {
      return NextResponse.json({ error: '定義が見つかりません' }, { status: 404 });
    }

    switch (action) {
      case 'generate': {
        // 組合せを生成
        const startTime = Date.now();
        const method = (body.method as CombinatorialMethod) || definition.method;
        const constraints = body.applyConstraints !== false ? definition.constraints : undefined;
        let combinations;

        try {
          switch (method) {
            case 'PAIRWISE':
              combinations = generatePairwiseCombinations(definition.parameters, constraints);
              break;
            case 'ALL_COMBINATIONS':
              combinations = generateAllCombinations(definition.parameters, constraints);
              break;
            case 'ORTHOGONAL_ARRAY':
              if (!body.orthogonalArrayId) {
                return NextResponse.json({ error: '直交表IDを指定してください' }, { status: 400 });
              }
              combinations = generateOrthogonalArrayCombinations(
                definition.parameters,
                body.orthogonalArrayId,
                constraints
              );
              break;
            case 'N_WISE':
              const nLevel = body.nWiseLevel || definition.nWiseLevel || 2;
              combinations = generateNWiseCombinations(definition.parameters, nLevel, constraints);
              break;
            default:
              return NextResponse.json({ error: '無効な組合せ手法です' }, { status: 400 });
          }
        } catch (err) {
          return NextResponse.json(
            { error: err instanceof Error ? err.message : '組合せ生成に失敗しました' },
            { status: 400 }
          );
        }

        const endTime = Date.now();

        // カバレッジを計算
        const coverage = calculateCoverage(combinations, definition.parameters);

        // 統計を計算
        const allCombinationsCount = definition.parameters.reduce(
          (acc, p) => acc * p.values.length,
          1
        );
        const statistics: GenerationStatistics = {
          totalCombinations: combinations.length,
          allCombinationsCount,
          reductionPercentage:
            allCombinationsCount > 0
              ? Math.round((1 - combinations.length / allCombinationsCount) * 100)
              : 0,
          generationTimeMs: endTime - startTime,
          constraintViolations: 0,
        };

        // 結果を保存
        await saveGenerationResult(defId, {
          method,
          combinations,
          coverage,
          statistics,
        });

        return NextResponse.json({
          combinations,
          coverage,
          statistics,
        });
      }

      case 'getResult': {
        // 保存済みの生成結果を取得
        const result = await getGenerationResult(defId);
        if (!result) {
          return NextResponse.json({ error: '生成結果がありません' }, { status: 404 });
        }
        return NextResponse.json(result);
      }

      default:
        return NextResponse.json({ error: '無効なアクションです' }, { status: 400 });
    }
  } catch (error) {
    console.error('Failed to process combinatorial action:', error);
    return NextResponse.json({ error: '操作の処理に失敗しました' }, { status: 500 });
  }
}
