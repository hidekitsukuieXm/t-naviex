/**
 * Version Restore API
 *
 * バージョン復元API
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTestSpecById } from '@/lib/repositories/test-spec-repository';
import { getVersion, restoreVersion } from '@/repositories/version-management-repository';
import { validateVersionString } from '@/types/version-management';

interface RouteParams {
  params: Promise<{ id: string; versionId: string }>;
}

// POST /api/test-specs/[id]/versions/[versionId]/restore - バージョン復元
export async function POST(request: Request, { params }: RouteParams) {
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

    // ロック状態の確認
    if (testSpec.isLocked) {
      return NextResponse.json(
        { error: 'ロックされているテスト仕様書は復元できません。' },
        { status: 403 }
      );
    }

    // バージョンの存在確認
    const version = await getVersion(versionId);
    if (!version) {
      return NextResponse.json({ error: 'バージョンが見つかりません。' }, { status: 404 });
    }

    // バージョンが指定されたテスト仕様書に属しているか確認
    if (version.testSpecId !== id) {
      return NextResponse.json({ error: 'バージョンが見つかりません。' }, { status: 404 });
    }

    // コンテンツの存在確認
    if (!version.content) {
      return NextResponse.json(
        { error: 'このバージョンにはスナップショットがありません。' },
        { status: 400 }
      );
    }

    const body = await request.json();
    const { createNewVersion, newVersionNumber, changeNote } = body;

    // 新しいバージョン番号のバリデーション
    if (createNewVersion && newVersionNumber) {
      const validation = validateVersionString(newVersionNumber);
      if (!validation.valid) {
        return NextResponse.json({ error: validation.message }, { status: 400 });
      }
    }

    const result = await restoreVersion(versionId, session.user.id, {
      createNewVersion,
      newVersionNumber,
      changeNote,
    });

    return NextResponse.json({
      success: result.success,
      message: `${result.restoredSections}個のセクションと${result.restoredTestCases}個のテストケースを復元しました。`,
      restoredSections: result.restoredSections,
      restoredTestCases: result.restoredTestCases,
      newVersion: result.newVersion,
    });
  } catch (error) {
    if (error instanceof Error) {
      console.error('Restore version error:', error.message);
      return NextResponse.json({ error: error.message }, { status: 500 });
    }
    console.error('Restore version error:', error);
    return NextResponse.json({ error: 'バージョンの復元に失敗しました。' }, { status: 500 });
  }
}
