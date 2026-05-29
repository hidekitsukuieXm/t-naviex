/**
 * Google Workspace Connection Test API
 *
 * Google Workspace接続テストエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { GoogleWorkspaceProvider } from '@/services/sso/google-workspace-provider';

/**
 * POST /api/sso/google-workspace/test
 * Google Workspace接続テストを実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, clientSecret, hostedDomain } = body;

    // パラメータチェック
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'クライアントID、クライアントシークレットは必須です' },
        { status: 400 }
      );
    }

    // リダイレクトURIを構築（テスト用）
    const baseUrl = process.env['NEXTAUTH_URL'] || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/sso/google-workspace/callback`;

    // プロバイダーを初期化
    const provider = new GoogleWorkspaceProvider({
      clientId,
      clientSecret,
      redirectUri,
      hostedDomain,
    });

    // 接続テストを実行
    const result = await provider.testConnection();

    return NextResponse.json(result);
  } catch (error) {
    console.error('Google Workspace接続テストエラー:', error);
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
