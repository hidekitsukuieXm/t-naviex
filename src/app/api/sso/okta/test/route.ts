/**
 * Okta Connection Test API
 *
 * Okta接続テストエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { OktaProvider } from '@/services/sso/okta-provider';

/**
 * POST /api/sso/okta/test
 * Okta接続テストを実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { domain, clientId, clientSecret } = body;

    // パラメータチェック
    if (!domain || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Oktaドメイン、クライアントID、クライアントシークレットは必須です' },
        { status: 400 }
      );
    }

    // リダイレクトURIを構築（テスト用）
    const baseUrl = process.env['NEXTAUTH_URL'] || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/sso/okta/callback`;

    // プロバイダーを初期化
    const provider = new OktaProvider({
      domain,
      clientId,
      clientSecret,
      redirectUri,
    });

    // 接続テストを実行
    const result = await provider.testConnection();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Okta接続テストエラー:', error);
    return NextResponse.json(
      {
        success: false,
        message: error instanceof Error ? error.message : 'Unknown error',
        details: {},
      },
      { status: 500 }
    );
  }
}
