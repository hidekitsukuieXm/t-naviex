/**
 * Version Detail API
 *
 * 特定バージョンの詳細取得API
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTestSpecById } from '@/lib/repositories/test-spec-repository';
import { getVersion } from '@/repositories/version-management-repository';

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>;
}

// GET /api/test-specs/[id]/versions/[versionId] - バージョン詳細取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id, versionId } = await params;

    if (!id) {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    if (!versionId) {
      return NextResponse.json({ error: 'バージョンIDは必須です。' }, { status: 400 });
    }

    // テスト仕様書の存在確認
    const testSpec = await getTestSpecById(BigInt(id));
    if (!testSpec) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    const version = await getVersion(versionId);
    if (!version) {
      return NextResponse.json({ error: 'バージョンが見つかりません。' }, { status: 404 });
    }

    // バージョンが指定されたテスト仕様書に属しているか確認
    if (version.testSpecId !== id) {
      return NextResponse.json({ error: 'バージョンが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(version);
  } catch (error) {
    console.error('Get version detail error:', error);
    return NextResponse.json({ error: 'バージョンの取得に失敗しました。' }, { status: 500 });
  }
}
