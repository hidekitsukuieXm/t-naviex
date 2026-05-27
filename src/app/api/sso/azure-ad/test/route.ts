/**
 * Azure AD Connection Test API
 *
 * Azure AD接続テストエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { AzureAdProvider } from '@/services/sso/azure-ad-provider';

/**
 * POST /api/sso/azure-ad/test
 * Azure AD接続テストを実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, clientId, clientSecret } = body;

    // パラメータチェック
    if (!tenantId || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'テナントID、クライアントID、クライアントシークレットは必須です' },
        { status: 400 }
      );
    }

    // リダイレクトURIを構築（テスト用）
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/sso/azure-ad/callback`;

    // プロバイダーを初期化
    const provider = new AzureAdProvider({
      tenantId,
      clientId,
      clientSecret,
      redirectUri,
    });

    // 接続テストを実行
    const result = await provider.testConnection();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Azure AD接続テストエラー:', error);
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
