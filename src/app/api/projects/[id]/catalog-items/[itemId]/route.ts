import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getCatalogItemById,
  getCatalogItemByName,
  updateCatalogItem,
  deleteCatalogItem,
  duplicateCatalogItem,
} from '@/repositories/catalog-item-repository';
import { validateUpdateCatalogItemInput } from '@/types/catalog-item';

interface RouteParams {
  params: Promise<{ id: string; itemId: string }>;
}

/**
 * GET /api/projects/[id]/catalog-items/[itemId]
 * カタログアイテム詳細取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id, itemId } = await params;
    const projectId = BigInt(id);
    const catalogItemId = BigInt(itemId);

    const item = await getCatalogItemById(projectId, catalogItemId);

    if (!item) {
      return NextResponse.json({ error: 'カタログアイテムが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(item);
  } catch (error) {
    console.error('Failed to get catalog item:', error);
    return NextResponse.json({ error: 'カタログアイテムの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/catalog-items/[itemId]
 * カタログアイテム更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id, itemId } = await params;
    const projectId = BigInt(id);
    const catalogItemId = BigInt(itemId);
    const userId = BigInt(session.user.id);
    const body = await request.json();

    // 存在確認
    const existing = await getCatalogItemById(projectId, catalogItemId);
    if (!existing) {
      return NextResponse.json({ error: 'カタログアイテムが見つかりません' }, { status: 404 });
    }

    // バリデーション
    const validation = validateUpdateCatalogItemInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    // 名前変更時の重複チェック
    if (body.name && body.name !== existing.name) {
      const nameConflict = await getCatalogItemByName(projectId, body.name);
      if (nameConflict) {
        return NextResponse.json(
          { error: '同じ名前のカタログアイテムが既に存在します' },
          { status: 409 }
        );
      }
    }

    const item = await updateCatalogItem(projectId, catalogItemId, body, userId);

    return NextResponse.json(item);
  } catch (error) {
    console.error('Failed to update catalog item:', error);
    return NextResponse.json({ error: 'カタログアイテムの更新に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/catalog-items/[itemId]
 * カタログアイテム削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id, itemId } = await params;
    const projectId = BigInt(id);
    const catalogItemId = BigInt(itemId);

    // 存在確認
    const existing = await getCatalogItemById(projectId, catalogItemId);
    if (!existing) {
      return NextResponse.json({ error: 'カタログアイテムが見つかりません' }, { status: 404 });
    }

    await deleteCatalogItem(projectId, catalogItemId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete catalog item:', error);
    return NextResponse.json({ error: 'カタログアイテムの削除に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/catalog-items/[itemId]
 * カタログアイテム複製
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { id, itemId } = await params;
    const projectId = BigInt(id);
    const catalogItemId = BigInt(itemId);
    const userId = BigInt(session.user.id);
    const body = await request.json();

    const action = body.action;

    if (action === 'duplicate') {
      const newName = body.name;
      if (!newName || typeof newName !== 'string') {
        return NextResponse.json({ error: '新しい名前は必須です' }, { status: 400 });
      }

      // 同名チェック
      const existing = await getCatalogItemByName(projectId, newName);
      if (existing) {
        return NextResponse.json(
          { error: '同じ名前のカタログアイテムが既に存在します' },
          { status: 409 }
        );
      }

      const item = await duplicateCatalogItem(projectId, catalogItemId, newName, userId);
      return NextResponse.json(item, { status: 201 });
    }

    return NextResponse.json({ error: '不明なアクションです' }, { status: 400 });
  } catch (error) {
    console.error('Failed to process catalog item action:', error);
    return NextResponse.json({ error: 'カタログアイテムの操作に失敗しました' }, { status: 500 });
  }
}
