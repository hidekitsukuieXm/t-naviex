import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTestSpecById,
  getTestSpecVersions,
  createTestSpecVersion,
} from '@/lib/repositories/test-spec-repository';
import { logTestSpecVersionCreate } from '@/lib/audit';
import { validateTestSpecVersion, validateVersion, compareVersions } from '@/types/test-spec';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/test-specs/[id]/versions - バージョン履歴取得
export async function GET(request: Request, { params }: RouteParams) {
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

    const versions = await getTestSpecVersions(BigInt(id));

    return NextResponse.json({
      testSpecId: id,
      currentVersion: testSpec.version,
      versions,
    });
  } catch (error) {
    console.error('Get test spec versions error:', error);
    return NextResponse.json({ error: 'バージョン履歴の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/test-specs/[id]/versions - 新バージョン作成
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

    const body = await request.json();

    // バリデーション
    if (!body.version || body.version.trim() === '') {
      return NextResponse.json({ error: 'バージョンは必須です。' }, { status: 400 });
    }

    const versionValidation = validateVersion(body.version);
    if (!versionValidation.valid) {
      return NextResponse.json({ error: versionValidation.error }, { status: 400 });
    }

    const validation = validateTestSpecVersion({
      version: body.version,
      changeNote: body.changeNote,
    });

    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // テスト仕様書の存在確認
    const testSpec = await getTestSpecById(BigInt(id));
    if (!testSpec) {
      return NextResponse.json({ error: 'テスト仕様書が見つかりません。' }, { status: 404 });
    }

    // ロック状態の確認
    if (testSpec.isLocked) {
      return NextResponse.json(
        { error: 'ロックされているテスト仕様書のバージョンは更新できません。' },
        { status: 403 }
      );
    }

    // 新しいバージョンが現在のバージョンより大きいかチェック
    const comparison = compareVersions(body.version, testSpec.version);
    if (comparison <= 0) {
      return NextResponse.json(
        { error: '新しいバージョンは現在のバージョンより大きい必要があります。' },
        { status: 400 }
      );
    }

    // 同じバージョンが既に存在しないかチェック
    const existingVersions = await getTestSpecVersions(BigInt(id));
    const versionExists = existingVersions.some((v) => v.version === body.version);
    if (versionExists) {
      return NextResponse.json(
        { error: 'このバージョン番号は既に使用されています。' },
        { status: 409 }
      );
    }

    const result = await createTestSpecVersion(BigInt(id), {
      version: body.version,
      changeNote: body.changeNote || null,
      createdBy: session.user.id,
    });

    // 監査ログ
    await logTestSpecVersionCreate(session.user.id, id, {
      version: body.version,
      previousVersion: testSpec.version,
    });

    return NextResponse.json(result, { status: 201 });
  } catch (error) {
    if (error instanceof Error && error.message.includes('ロックされている')) {
      return NextResponse.json({ error: error.message }, { status: 403 });
    }
    if (error instanceof Error && error.message.includes('見つかりません')) {
      return NextResponse.json({ error: error.message }, { status: 404 });
    }
    console.error('Create test spec version error:', error);
    return NextResponse.json({ error: 'バージョンの作成に失敗しました。' }, { status: 500 });
  }
}
