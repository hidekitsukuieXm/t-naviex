/**
 * Version Comparison API
 *
 * バージョン間比較API
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTestSpecById } from '@/lib/repositories/test-spec-repository';
import { compareVersions, compareWithCurrent } from '@/repositories/version-management-repository';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// POST /api/test-specs/[id]/versions/compare - バージョン比較
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    if (!id) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    // テスト仕様書の存在確認
    const testSpec = await getTestSpecById(BigInt(id));
    if (!testSpec) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    const body = await request.json();
    const { sourceVersionId, targetVersionId } = body;

    // 現在のバージョンとの比較の場合
    if (sourceVersionId === 'current') {
      if (!targetVersionId) {
        return NextResponse.json({ error: '比較対象のバージョンIDは必須です。' }, { status: 400 });
      }

      const comparison = await compareWithCurrent(id, targetVersionId);
      if (!comparison) {
        return NextResponse.json(
          { error: '比較対象のバージョンが見つかりません。' },
          { status: 404 }
        );
      }

      return NextResponse.json(comparison);
    }

    // 2つのバージョン間の比較
    if (!sourceVersionId || !targetVersionId) {
      return NextResponse.json(
        { error: 'ソースバージョンIDとターゲットバージョンIDは必須です。' },
        { status: 400 }
      );
    }

    const comparison = await compareVersions(sourceVersionId, targetVersionId);
    if (!comparison) {
      return NextResponse.json({ error: 'バージョンが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(comparison);
  } catch (error) {
    console.error('Compare versions error:', error);
    return NextResponse.json({ error: 'バージョン比較に失敗しました。' }, { status: 500 });
  }
}
