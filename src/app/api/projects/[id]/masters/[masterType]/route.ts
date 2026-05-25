/**
 * マスタ一覧・作成 API
 * GET /api/projects/[id]/masters/[masterType] - マスタ一覧取得
 * POST /api/projects/[id]/masters/[masterType] - マスタ作成
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getMasterItems,
  createMasterItem,
  getMasterItemByCode,
  initializeMaster,
} from '@/lib/repositories/master-repository';
import { projectExists } from '@/lib/repositories/project-repository';
import type { MasterType } from '@/types/master';
import { validateCreateMasterItemInput, MASTER_TYPE_LABELS } from '@/types/master';

type RouteParams = {
  params: Promise<{ id: string; masterType: string }>;
};

const VALID_MASTER_TYPES: MasterType[] = ['testType', 'testTechnique', 'testPerspective'];

function isValidMasterType(type: string): type is MasterType {
  return VALID_MASTER_TYPES.includes(type as MasterType);
}

/**
 * GET /api/projects/[id]/masters/[masterType]
 * マスタ一覧を取得
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, masterType } = await params;

    // マスタタイプのバリデーション
    if (!isValidMasterType(masterType)) {
      return NextResponse.json({ error: '無効なマスタタイプです。' }, { status: 400 });
    }

    // プロジェクト存在確認
    const exists = await projectExists(projectId);
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // クエリパラメータ
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const initialize = searchParams.get('initialize') === 'true';

    // 初期化リクエストの場合
    if (initialize) {
      await initializeMaster(projectId, masterType);
    }

    const result = await getMasterItems(projectId, masterType, { activeOnly });

    return NextResponse.json(result);
  } catch (error) {
    console.error('マスタ一覧取得エラー:', error);
    return NextResponse.json({ error: 'マスタの取得に失敗しました。' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/masters/[masterType]
 * マスタを作成
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, masterType } = await params;

    // マスタタイプのバリデーション
    if (!isValidMasterType(masterType)) {
      return NextResponse.json({ error: '無効なマスタタイプです。' }, { status: 400 });
    }

    // プロジェクト存在確認
    const exists = await projectExists(projectId);
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // 入力バリデーション
    const validation = validateCreateMasterItemInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // コード重複チェック
    const existingItem = await getMasterItemByCode(projectId, masterType, body.code.toUpperCase());
    if (existingItem) {
      return NextResponse.json(
        { error: `同じコードの${MASTER_TYPE_LABELS[masterType]}が既に存在します。` },
        { status: 409 }
      );
    }

    const item = await createMasterItem(projectId, masterType, body);

    return NextResponse.json(item, { status: 201 });
  } catch (error) {
    console.error('マスタ作成エラー:', error);
    return NextResponse.json({ error: 'マスタの作成に失敗しました。' }, { status: 500 });
  }
}
