import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { type UpdateWatchlistData } from '@/types/watchlist';
import { logAudit } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

// GET /api/watchlist/[id] - ウォッチリスト項目詳細取得
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const itemId = BigInt(id);
    const userId = BigInt(session.user.id);

    const item = await prisma.watchlist.findUnique({
      where: { id: itemId },
    });

    if (!item) {
      return NextResponse.json({ error: 'ウォッチリスト項目が見つかりません。' }, { status: 404 });
    }

    // 自分のウォッチリスト項目のみ取得可能
    if (item.userId !== userId) {
      return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
    }

    return NextResponse.json({
      id: item.id.toString(),
      userId: item.userId.toString(),
      entityType: item.entityType,
      entityId: item.entityId.toString(),
      notifyEmail: item.notifyEmail,
      notifyInApp: item.notifyInApp,
      createdAt: item.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Get watchlist item error:', error);
    return NextResponse.json(
      { error: 'ウォッチリスト項目の取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// PUT /api/watchlist/[id] - ウォッチリスト項目更新（通知設定）
export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const itemId = BigInt(id);
    const userId = BigInt(session.user.id);

    const body: UpdateWatchlistData = await request.json();

    const existing = await prisma.watchlist.findUnique({
      where: { id: itemId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ウォッチリスト項目が見つかりません。' }, { status: 404 });
    }

    // 自分のウォッチリスト項目のみ更新可能
    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
    }

    const item = await prisma.watchlist.update({
      where: { id: itemId },
      data: {
        ...(body.notifyEmail !== undefined && { notifyEmail: body.notifyEmail }),
        ...(body.notifyInApp !== undefined && { notifyInApp: body.notifyInApp }),
      },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: 'WATCHLIST_UPDATE',
      targetType: 'WATCHLIST',
      targetId: item.id.toString(),
      details: {
        entityType: item.entityType,
        entityId: item.entityId.toString(),
        notifyEmail: item.notifyEmail,
        notifyInApp: item.notifyInApp,
      },
    });

    return NextResponse.json({
      id: item.id.toString(),
      userId: item.userId.toString(),
      entityType: item.entityType,
      entityId: item.entityId.toString(),
      notifyEmail: item.notifyEmail,
      notifyInApp: item.notifyInApp,
      createdAt: item.createdAt.toISOString(),
    });
  } catch (error) {
    console.error('Update watchlist item error:', error);
    return NextResponse.json(
      { error: 'ウォッチリスト項目の更新に失敗しました。' },
      { status: 500 }
    );
  }
}

// DELETE /api/watchlist/[id] - ウォッチリストから削除
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const itemId = BigInt(id);
    const userId = BigInt(session.user.id);

    const existing = await prisma.watchlist.findUnique({
      where: { id: itemId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'ウォッチリスト項目が見つかりません。' }, { status: 404 });
    }

    // 自分のウォッチリスト項目のみ削除可能
    if (existing.userId !== userId) {
      return NextResponse.json({ error: 'アクセス権限がありません。' }, { status: 403 });
    }

    await prisma.watchlist.delete({
      where: { id: itemId },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: 'WATCHLIST_REMOVE',
      targetType: 'WATCHLIST',
      targetId: id,
      details: {
        entityType: existing.entityType,
        entityId: existing.entityId.toString(),
      },
    });

    return NextResponse.json({ message: 'ウォッチリストから削除しました。' });
  } catch (error) {
    console.error('Delete watchlist item error:', error);
    return NextResponse.json(
      { error: 'ウォッチリストからの削除に失敗しました。' },
      { status: 500 }
    );
  }
}
