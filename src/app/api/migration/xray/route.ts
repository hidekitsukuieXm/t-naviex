/**
 * Xray Migration API
 * POST /api/migration/xray - Xrayからのインポート実行
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { importFromXray, validateXrayConfig } from '@/services/migration/xray-importer';
import type { XrayConfig } from '@/services/migration/xray-importer';

// POST /api/migration/xray
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();
    const { config, options } = body;

    if (!config) {
      return NextResponse.json({ error: 'Xray設定が必要です。' }, { status: 400 });
    }

    if (!options) {
      return NextResponse.json({ error: 'インポートオプションが必要です。' }, { status: 400 });
    }

    // 設定のバリデーション
    const configValidation = validateXrayConfig(config as XrayConfig);
    if (!configValidation.valid) {
      return NextResponse.json({ error: configValidation.errors.join(' ') }, { status: 400 });
    }

    // インポート実行
    const result = await importFromXray(config, options, BigInt(session.user.id));

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Xray import error:', error);
    return NextResponse.json({ error: 'Xrayからのインポートに失敗しました。' }, { status: 500 });
  }
}
