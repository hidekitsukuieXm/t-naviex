/**
 * マスタ個別操作 API
 * GET /api/projects/[id]/masters/[masterType]/[itemId] - マスタ取得
 * PUT /api/projects/[id]/masters/[masterType]/[itemId] - マスタ更新
 * DELETE /api/projects/[id]/masters/[masterType]/[itemId] - マスタ削除
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getMasterItem,
  updateMasterItem,
  deleteMasterItem,
  getMasterItemByCode,
} from '@/lib/repositories/master-repository';
import { projectExists } from '@/lib/repositories/project-repository';
import type { MasterType } from '@/types/master';
import { validateUpdateMasterItemInput, MASTER_TYPE_LABELS } from '@/types/master';

type RouteParams = {
  params: Promise<{ id: string; masterType: string; itemId: string }>;
};

const VALID_MASTER_TYPES: MasterType[] = ['testType', 'testTechnique', 'testPerspective'];

function isValidMasterType(type: string): type is MasterType {
  return VALID_MASTER_TYPES.includes(type as MasterType);
}

/**
 * GET /api/projects/[id]/masters/[masterType]/[itemId]
 * マスタを取得
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, masterType, itemId } = await params;

    // マスタタイプのバリデーション
    if (!isValidMasterType(masterType)) {
      return NextResponse.json({ error: '無効なマスタタイプです。' }, { status: 400 });
    }

    // プロジェクト存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const item = await getMasterItem(projectId, masterType, itemId);
    if (!item) {
      return NextResponse.json(
        { error: `${MASTER_TYPE_LABELS[masterType]}が見つかりません。` },
        { status: 404 }
      );
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('マスタ取得エラー:', error);
    return NextResponse.json({ error: 'マスタの取得に失敗しました。' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/masters/[masterType]/[itemId]
 * マスタを更新
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, masterType, itemId } = await params;

    // マスタタイプのバリデーション
    if (!isValidMasterType(masterType)) {
      return NextResponse.json({ error: '無効なマスタタイプです。' }, { status: 400 });
    }

    // プロジェクト存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // マスタ存在確認
    const existingItem = await getMasterItem(projectId, masterType, itemId);
    if (!existingItem) {
      return NextResponse.json(
        { error: `${MASTER_TYPE_LABELS[masterType]}が見つかりません。` },
        { status: 404 }
      );
    }

    const body = await request.json();

    // 入力バリデーション
    const validation = validateUpdateMasterItemInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // コード変更時の重複チェック
    if (body.code !== undefined && body.code.toUpperCase() !== existingItem.code) {
      const duplicateItem = await getMasterItemByCode(
        projectId,
        masterType,
        body.code.toUpperCase()
      );
      if (duplicateItem) {
        return NextResponse.json(
          { error: `同じコードの${MASTER_TYPE_LABELS[masterType]}が既に存在します。` },
          { status: 409 }
        );
      }
    }

    const item = await updateMasterItem(projectId, masterType, itemId, body);

    return NextResponse.json(item);
  } catch (error) {
    console.error('マスタ更新エラー:', error);
    return NextResponse.json({ error: 'マスタの更新に失敗しました。' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/masters/[masterType]/[itemId]
 * マスタを削除
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, masterType, itemId } = await params;

    // マスタタイプのバリデーション
    if (!isValidMasterType(masterType)) {
      return NextResponse.json({ error: '無効なマスタタイプです。' }, { status: 400 });
    }

    // プロジェクト存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // マスタ存在確認
    const existingItem = await getMasterItem(projectId, masterType, itemId);
    if (!existingItem) {
      return NextResponse.json(
        { error: `${MASTER_TYPE_LABELS[masterType]}が見つかりません。` },
        { status: 404 }
      );
    }

    await deleteMasterItem(projectId, masterType, itemId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('マスタ削除エラー:', error);
    return NextResponse.json({ error: 'マスタの削除に失敗しました。' }, { status: 500 });
  }
}
