/**
 * MFA API Route
 *
 * 多要素認証APIルート
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getMfaStatus,
  initializeMfaSetup,
  enableMfa,
  disableMfa,
  verifyMfa,
  regenerateBackupCodes,
} from '@/repositories/mfa-repository';
import { generateOtpAuthUrl } from '@/types/mfa';

/**
 * MFAステータスを取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const userId = searchParams.get('userId');

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    const status = await getMfaStatus(userId);
    return NextResponse.json(status);
  } catch (error) {
    console.error('Failed to get MFA status:', error);
    return NextResponse.json({ error: 'MFAステータスの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * MFAセットアップを開始
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { userId, action, mfaType, code, accountName } = body;

    if (!userId) {
      return NextResponse.json({ error: 'userId is required' }, { status: 400 });
    }

    switch (action) {
      case 'setup': {
        // MFAセットアップを開始
        const { secret, backupCodes } = await initializeMfaSetup(userId, mfaType);
        const qrCodeUrl = generateOtpAuthUrl(secret, accountName || `user-${userId}`);

        return NextResponse.json({
          secret,
          qrCodeUrl,
          backupCodes,
        });
      }

      case 'enable': {
        // TOTPコードを検証してMFAを有効化
        if (!code) {
          return NextResponse.json({ error: 'code is required' }, { status: 400 });
        }

        // 実際のTOTP検証はverifyMfaで行う
        const isValid = await verifyMfa(userId, code);

        if (!isValid) {
          return NextResponse.json(
            { success: false, message: '認証コードが無効です' },
            { status: 400 }
          );
        }

        const setting = await enableMfa(userId);
        if (!setting) {
          return NextResponse.json({ error: 'MFA設定が見つかりません' }, { status: 404 });
        }

        return NextResponse.json({
          success: true,
          message: 'MFAが有効化されました',
        });
      }

      case 'disable': {
        // MFAを無効化
        if (!code) {
          return NextResponse.json({ error: 'code is required' }, { status: 400 });
        }

        const isValid = await verifyMfa(userId, code);
        if (!isValid) {
          return NextResponse.json(
            { success: false, message: '認証コードが無効です' },
            { status: 400 }
          );
        }

        const success = await disableMfa(userId);
        if (!success) {
          return NextResponse.json({ error: 'MFA無効化に失敗しました' }, { status: 500 });
        }

        return NextResponse.json({
          success: true,
          message: 'MFAが無効化されました',
        });
      }

      case 'verify': {
        // MFA検証
        if (!code) {
          return NextResponse.json({ error: 'code is required' }, { status: 400 });
        }

        const ipAddress = request.headers.get('x-forwarded-for') || undefined;
        const userAgent = request.headers.get('user-agent') || undefined;

        const success = await verifyMfa(userId, code, ipAddress, userAgent);

        return NextResponse.json({
          success,
          message: success ? '認証に成功しました' : '認証に失敗しました',
        });
      }

      case 'regenerate-backup-codes': {
        // バックアップコードを再生成
        if (!code) {
          return NextResponse.json({ error: 'code is required' }, { status: 400 });
        }

        const isValid = await verifyMfa(userId, code);
        if (!isValid) {
          return NextResponse.json(
            { success: false, message: '認証コードが無効です' },
            { status: 400 }
          );
        }

        const backupCodes = await regenerateBackupCodes(userId);
        if (!backupCodes) {
          return NextResponse.json(
            { error: 'バックアップコードの再生成に失敗しました' },
            { status: 500 }
          );
        }

        return NextResponse.json({ backupCodes });
      }

      default:
        return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
    }
  } catch (error) {
    console.error('MFA operation failed:', error);
    return NextResponse.json({ error: 'MFA操作に失敗しました' }, { status: 500 });
  }
}
