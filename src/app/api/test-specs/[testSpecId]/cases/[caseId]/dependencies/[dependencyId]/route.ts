/**
 * テストケース依存関係個別 API
 * PUT /api/test-specs/[testSpecId]/cases/[caseId]/dependencies/[dependencyId] - 依存関係更新
 * DELETE /api/test-specs/[testSpecId]/cases/[caseId]/dependencies/[dependencyId] - 依存関係削除
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  updateCaseDependency,
  deleteCaseDependency,
  testCaseExists,
  testCaseBelongsToSpec,
} from '@/lib/repositories/case-dependency-repository';
import { CASE_DEPENDENCY_TYPE } from '@/types/case-dependency';
import type { CaseDependencyType } from '@/types/case-dependency';

interface RouteParams {
  params: Promise<{ testSpecId: string; caseId: string; dependencyId: string }>;
}

// PUT /api/test-specs/[testSpecId]/cases/[caseId]/dependencies/[dependencyId]
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { testSpecId, caseId, dependencyId } = await params;

    if (!testSpecId || !caseId || !dependencyId) {
      return NextResponse.json(
        { error: 'テスト仕様書ID、ケースID、依存関係IDは必須です。' },
        { status: 400 }
      );
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

    const updated = await updateCaseDependency(BigInt(dependencyId), {
      dependencyType: body.dependencyType as CaseDependencyType | undefined,
      description: body.description,
    });

    if (!updated) {
      return NextResponse.json({ error: '依存関係が見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(updated);
  } catch (error) {
    console.error('Update case dependency error:', error);
    return NextResponse.json({ error: '依存関係の更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/test-specs/[testSpecId]/cases/[caseId]/dependencies/[dependencyId]
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { testSpecId, caseId, dependencyId } = await params;

    if (!testSpecId || !caseId || !dependencyId) {
      return NextResponse.json(
        { error: 'テスト仕様書ID、ケースID、依存関係IDは必須です。' },
        { status: 400 }
      );
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

    const deleted = await deleteCaseDependency(BigInt(dependencyId));

    if (!deleted) {
      return NextResponse.json({ error: '依存関係が見つかりません。' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete case dependency error:', error);
    return NextResponse.json({ error: '依存関係の削除に失敗しました。' }, { status: 500 });
  }
}
