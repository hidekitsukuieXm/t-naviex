import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { type WatchlistEntityType } from '@/types/watchlist';

// GET /api/watchlist/status?entityType=PROJECT&entityId=123 - ウォッチ状態確認
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const entityType = searchParams.get('entityType') as WatchlistEntityType | null;
    const entityId = searchParams.get('entityId');

    if (!entityType || !entityId) {
      return NextResponse.json({ error: 'entityTypeとentityIdは必須です。' }, { status: 400 });
    }

    const userId = BigInt(session.user.id);
    const entityIdBigInt = BigInt(entityId);

    const item = await prisma.watchlist.findUnique({
      where: {
        userId_entityType_entityId: {
          userId,
          entityType,
          entityId: entityIdBigInt,
        },
      },
    });

    if (!item) {
      return NextResponse.json({
        isWatching: false,
        item: null,
      });
    }

    return NextResponse.json({
      isWatching: true,
      item: {
        id: item.id.toString(),
        userId: item.userId.toString(),
        entityType: item.entityType,
        entityId: item.entityId.toString(),
        notifyEmail: item.notifyEmail,
        notifyInApp: item.notifyInApp,
        createdAt: item.createdAt.toISOString(),
      },
    });
  } catch (error) {
    console.error('Get watch status error:', error);
    return NextResponse.json({ error: 'ウォッチ状態の取得に失敗しました。' }, { status: 500 });
  }
}
