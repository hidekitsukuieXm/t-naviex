import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import {
  validateWatchlistData,
  type WatchlistItem,
  type AddWatchlistData,
  type WatchlistEntityType,
} from '@/types/watchlist';
import { logAudit } from '@/lib/audit';

// GET /api/watchlist - ウォッチリスト一覧取得
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as WatchlistEntityType | null;

    const userId = BigInt(session.user.id);

    const items = await prisma.watchlist.findMany({
      where: {
        userId,
        ...(entityType && { entityType }),
      },
      orderBy: { createdAt: 'desc' },
    });

    const serialized: WatchlistItem[] = items.map((item) => ({
      id: item.id.toString(),
      userId: item.userId.toString(),
      entityType: item.entityType as WatchlistEntityType,
      entityId: item.entityId.toString(),
      notifyEmail: item.notifyEmail,
      notifyInApp: item.notifyInApp,
      createdAt: item.createdAt.toISOString(),
    }));

    return NextResponse.json({
      items: serialized,
      total: serialized.length,
    });
  } catch (error) {
    console.error('Get watchlist error:', error);
    return NextResponse.json({ error: 'ウォッチリストの取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/watchlist - ウォッチリストに追加
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body: AddWatchlistData = await request.json();

    // バリデーション
    const validation = validateWatchlistData(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    const userId = BigInt(session.user.id);
    const entityId = BigInt(body.entityId);

    // 既に登録されているかチェック
    const existing = await prisma.watchlist.findUnique({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType: body.entityType,
          entityId,
        },
      },
    });

    if (existing) {
      return NextResponse.json(
        { error: '既にウォッチリストに登録されています。' },
        { status: 400 }
      );
    }

    const item = await prisma.watchlist.create({
      data: {
        userId,
        entityType: body.entityType,
        entityId,
        notifyEmail: body.notifyEmail ?? true,
        notifyInApp: body.notifyInApp ?? true,
      },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: 'WATCHLIST_ADD',
      targetType: 'WATCHLIST',
      targetId: item.id.toString(),
      details: { entityType: body.entityType, entityId: body.entityId },
    });

    return NextResponse.json(
      {
        id: item.id.toString(),
        userId: item.userId.toString(),
        entityType: item.entityType,
        entityId: item.entityId.toString(),
        notifyEmail: item.notifyEmail,
        notifyInApp: item.notifyInApp,
        createdAt: item.createdAt.toISOString(),
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Add to watchlist error:', error);
    return NextResponse.json({ error: 'ウォッチリストへの追加に失敗しました。' }, { status: 500 });
  }
}
