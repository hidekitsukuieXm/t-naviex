/**
 * ADFS Connection Test API
 *
 * ADFS接続テストエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { AdfsProvider } from '@/services/sso/adfs-provider';

/**
 * POST /api/sso/adfs/test
 * ADFS接続テストを実行
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { adfsServer, entityId, relyingPartyIdentifier } = body;

    // パラメータチェック
    if (!adfsServer || !entityId || !relyingPartyIdentifier) {
      return NextResponse.json(
        { error: 'ADFSサーバー、エンティティID、証明書利用者識別子は必須です' },
        { status: 400 }
      );
    }

    // デフォルトURLを取得
    const urls = AdfsProvider.getDefaultUrls(adfsServer);

    // リダイレクトURIを構築（テスト用）
    const baseUrl = process.env['NEXTAUTH_URL'] || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/sso/adfs/callback`;

    // プロバイダーを初期化
    const provider = new AdfsProvider({
      federationMetadataUrl: urls.federationMetadataUrl,
      entityId,
      relyingPartyIdentifier,
      redirectUri,
    });

    // 接続テストを実行
    const result = await provider.testConnection();

    return NextResponse.json(result);
  } catch (error) {
    console.error('ADFS接続テストエラー:', error);
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
