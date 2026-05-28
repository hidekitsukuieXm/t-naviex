/**
 * Xray Connection Test API
 * POST /api/migration/xray/test-connection - 接続テスト
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { XrayClient, validateXrayConfig } from '@/services/migration/xray-importer';
import type { XrayConfig } from '@/services/migration/xray-importer';

// POST /api/migration/xray/test-connection
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();
    const config = body as XrayConfig;

    // 設定のバリデーション
    const configValidation = validateXrayConfig(config);
    if (!configValidation.valid) {
      return NextResponse.json({ error: configValidation.errors.join(' ') }, { status: 400 });
    }

    // 接続テスト
    const client = new XrayClient(config);
    const result = await client.testConnection();

    if (result.success) {
      return NextResponse.json({ success: true, message: '接続に成功しました。' });
    } else {
      return NextResponse.json(
        { success: false, error: result.error || '接続に失敗しました。' },
        { status: 400 }
      );
    }
  } catch (error) {
    console.error('Xray connection test error:', error);
    return NextResponse.json({ error: '接続テストに失敗しました。' }, { status: 500 });
  }
}
