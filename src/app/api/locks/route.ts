/**
 * Edit Lock API
 *
 * 編集ロックAPI
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  acquireLock,
  releaseLock,
  getLockStatus,
  refreshLock,
  forceReleaseLock,
  getUserLocks,
  cleanupExpiredLocks,
} from '@/repositories/edit-lock-repository';
import type { LockTargetType } from '@/types/edit-lock';

/**
 * GET /api/locks
 * ロック状態を確認 または ユーザーのロック一覧を取得
 */
export async function GET(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType') as LockTargetType | null;
    const targetId = searchParams.get('targetId');
    const userId = searchParams.get('userId') || '1'; // TODO: 認証から取得

    // ユーザーの全ロック一覧
    if (!targetType || !targetId) {
      const locks = await getUserLocks(userId);
      return NextResponse.json({ locks });
    }

    // 特定対象のロック状態
    const status = await getLockStatus(userId, targetType, targetId);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Failed to get lock status:', error);
    return NextResponse.json({ error: 'ロック状態の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/locks
 * ロックを取得
 */
export async function POST(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // TODO: 実際の認証からユーザー情報を取得
    const userId = body.userId || '1';
    const userName = body.userName || undefined;

    const { targetType, targetId, duration } = body;

    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'targetType と targetId は必須です' }, { status: 400 });
    }

    const result = await acquireLock(userId, userName, targetType, targetId, duration);

    return NextResponse.json(result, {
      status: result.acquired ? 200 : 409,
    });
  } catch (error) {
    console.error('Failed to acquire lock:', error);
    return NextResponse.json({ error: 'ロックの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * PATCH /api/locks
 * ロックを更新（ハートビート）
 */
export async function PATCH(request: NextRequest): Promise<NextResponse> {
  try {
    const body = await request.json();

    // TODO: 実際の認証からユーザーIDを取得
    const userId = body.userId || '1';

    const { targetType, targetId, duration } = body;

    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'targetType と targetId は必須です' }, { status: 400 });
    }

    const lock = await refreshLock(userId, targetType, targetId, duration);

    if (!lock) {
      return NextResponse.json(
        { error: 'ロックが見つからないか、権限がありません' },
        { status: 404 }
      );
    }

    return NextResponse.json({ lock });
  } catch (error) {
    console.error('Failed to refresh lock:', error);
    return NextResponse.json({ error: 'ロックの更新に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/locks
 * ロックを解放
 */
export async function DELETE(request: NextRequest): Promise<NextResponse> {
  try {
    const { searchParams } = new URL(request.url);
    const targetType = searchParams.get('targetType') as LockTargetType | null;
    const targetId = searchParams.get('targetId');
    const userId = searchParams.get('userId') || '1'; // TODO: 認証から取得
    const force = searchParams.get('force') === 'true';

    if (!targetType || !targetId) {
      return NextResponse.json({ error: 'targetType と targetId は必須です' }, { status: 400 });
    }

    let success: boolean;
    if (force) {
      // TODO: 管理者権限チェック
      success = await forceReleaseLock(targetType, targetId);
    } else {
      success = await releaseLock(userId, targetType, targetId);
    }

    if (!success) {
      return NextResponse.json(
        { error: 'ロックの解放に失敗しました（権限がない可能性があります）' },
        { status: 403 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to release lock:', error);
    return NextResponse.json({ error: 'ロックの解放に失敗しました' }, { status: 500 });
  }
}

/**
 * PUT /api/locks
 * 期限切れロックのクリーンアップ（管理用）
 */
export async function PUT(): Promise<NextResponse> {
  try {
    // TODO: 管理者権限チェック
    const count = await cleanupExpiredLocks();
    return NextResponse.json({ cleanedUp: count });
  } catch (error) {
    console.error('Failed to cleanup locks:', error);
    return NextResponse.json({ error: 'ロックのクリーンアップに失敗しました' }, { status: 500 });
  }
}
