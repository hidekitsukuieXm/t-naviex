/**
 * テストケース依存関係 API
 * GET /api/test-specs/[testSpecId]/cases/[caseId]/dependencies - 依存関係一覧取得
 * POST /api/test-specs/[testSpecId]/cases/[caseId]/dependencies - 依存関係追加
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getCaseDependencies,
  createCaseDependency,
  testCaseExists,
  testCaseBelongsToSpec,
  dependencyExists,
  checkCircularDependency,
} from '@/lib/repositories/case-dependency-repository';
import { CASE_DEPENDENCY_TYPE } from '@/types/case-dependency';
import type { CaseDependencyType } from '@/types/case-dependency';

interface RouteParams {
  params: Promise<{ testSpecId: string; caseId: string }>;
}

// GET /api/test-specs/[testSpecId]/cases/[caseId]/dependencies
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { testSpecId, caseId } = await params;

    if (!testSpecId || !caseId) {
      return NextResponse.json({ error: 'テスト仕様書IDとケースIDは必須です。' }, { status: 400 });
    }

    // テストケースの存在確認
    const caseExists = await testCaseExists(BigInt(caseId));
    if (!caseExists) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    // テストケースがテスト仕様書に属しているか確認
    const belongsToSpec = await testCaseBelongsToSpec(BigInt(caseId), BigInt(testSpecId));
    if (!belongsToSpec) {
      return NextResponse.json(
        { error: 'テストケースは指定されたテスト仕様書に属していません。' },
        { status: 400 }
      );
    }

    const dependencies = await getCaseDependencies(BigInt(caseId));

    return NextResponse.json(dependencies);
  } catch (error) {
    console.error('Get case dependencies error:', error);
    return NextResponse.json({ error: '依存関係の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/test-specs/[testSpecId]/cases/[caseId]/dependencies
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { testSpecId, caseId } = await params;

    if (!testSpecId || !caseId) {
      return NextResponse.json({ error: 'テスト仕様書IDとケースIDは必須です。' }, { status: 400 });
    }

    // テストケースの存在確認
    const caseExists = await testCaseExists(BigInt(caseId));
    if (!caseExists) {
      return NextResponse.json({ error: 'テストケースが見つかりません。' }, { status: 404 });
    }

    // テストケースがテスト仕様書に属しているか確認
    const belongsToSpec = await testCaseBelongsToSpec(BigInt(caseId), BigInt(testSpecId));
    if (!belongsToSpec) {
      return NextResponse.json(
        { error: 'テストケースは指定されたテスト仕様書に属していません。' },
        { status: 400 }
      );
    }

    const body = await request.json();

    // バリデーション
    if (!body.dependsOnId) {
      return NextResponse.json({ error: '依存先テストケースIDは必須です。' }, { status: 400 });
    }

    // 自己参照チェック
    if (caseId === body.dependsOnId) {
      return NextResponse.json(
        { error: '自分自身への依存関係は作成できません。' },
        { status: 400 }
      );
    }

    // 依存先テストケースの存在確認
    const dependsOnExists = await testCaseExists(BigInt(body.dependsOnId));
    if (!dependsOnExists) {
      return NextResponse.json({ error: '依存先テストケースが見つかりません。' }, { status: 404 });
    }

    // 依存先テストケースも同じテスト仕様書に属しているか確認
    const dependsOnBelongsToSpec = await testCaseBelongsToSpec(
      BigInt(body.dependsOnId),
      BigInt(testSpecId)
    );
    if (!dependsOnBelongsToSpec) {
      return NextResponse.json(
        { error: '依存先テストケースは同じテスト仕様書に属している必要があります。' },
        { status: 400 }
      );
    }

    // 既存の依存関係チェック
    const alreadyExists = await dependencyExists(BigInt(caseId), BigInt(body.dependsOnId));
    if (alreadyExists) {
      return NextResponse.json({ error: 'この依存関係は既に存在します。' }, { status: 409 });
    }

    // 循環依存チェック
    const isCircular = await checkCircularDependency(BigInt(caseId), BigInt(body.dependsOnId));
    if (isCircular) {
      return NextResponse.json(
        { error: '循環依存が発生するため、この依存関係は作成できません。' },
        { status: 400 }
      );
    }

    // 依存関係タイプのバリデーション
    if (body.dependencyType) {
      const validTypes = Object.values(CASE_DEPENDENCY_TYPE);
      if (!validTypes.includes(body.dependencyType)) {
        return NextResponse.json(
          { error: `依存関係タイプは次のいずれかである必要があります: ${validTypes.join(', ')}` },
          { status: 400 }
        );
      }
    }

    const dependency = await createCaseDependency({
      testCaseId: caseId,
      dependsOnId: body.dependsOnId,
      dependencyType: body.dependencyType as CaseDependencyType | undefined,
      description: body.description,
    });

    return NextResponse.json(dependency, { status: 201 });
  } catch (error) {
    console.error('Create case dependency error:', error);
    return NextResponse.json({ error: '依存関係の作成に失敗しました。' }, { status: 500 });
  }
}
