/**
 * SSO API Route
 *
 * シングルサインオンAPIルート
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getAllSsoConfigurations,
  getActiveSsoConfigurations,
  createSsoConfiguration,
} from '@/repositories/sso-repository';
import { validateSsoConfig, SSO_PROVIDERS } from '@/types/sso';

/**
 * SSO設定一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';
    const providers = searchParams.get('providers') === 'true';

    // プロバイダー情報一覧を返す
    if (providers) {
      return NextResponse.json({ providers: SSO_PROVIDERS });
    }

    // SSO設定一覧を返す
    const configs = activeOnly
      ? await getActiveSsoConfigurations()
      : await getAllSsoConfigurations();

    // シークレット情報を除去
    const safeConfigs = configs.map((config) => ({
      ...config,
      clientSecret: config.clientSecret ? '***' : undefined,
      privateKey: config.privateKey ? '***' : undefined,
    }));

    return NextResponse.json({ configurations: safeConfigs });
  } catch (error) {
    console.error('Failed to get SSO configurations:', error);
    return NextResponse.json({ error: 'SSO設定の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * SSO設定を作成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    // バリデーション
    const errors = validateSsoConfig(body);
    if (errors.length > 0) {
      return NextResponse.json({ error: 'バリデーションエラー', details: errors }, { status: 400 });
    }

    const config = await createSsoConfiguration(body);

    return NextResponse.json(config, { status: 201 });
  } catch (error) {
    console.error('Failed to create SSO configuration:', error);

    // 重複エラーの処理
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json({ error: '同じ名前のSSO設定が既に存在します' }, { status: 409 });
    }

    return NextResponse.json({ error: 'SSO設定の作成に失敗しました' }, { status: 500 });
  }
}
