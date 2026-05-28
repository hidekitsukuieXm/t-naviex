/**
 * ADFS SSO Auth API
 *
 * ADFS SSO認証開始エンドポイント
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AdfsProvider } from '@/services/sso/adfs-provider';
import { generateState } from '@/types/sso';

/**
 * GET /api/sso/adfs/auth
 * ADFS認証を開始（WS-Federation サインインURLにリダイレクト）
 */
export async function GET() {
  try {
    // ADFS設定を取得
    const config = await prisma.ssoConfiguration.findFirst({
      where: {
        name: 'adfs',
        status: 'ACTIVE',
      },
    });

    if (!config) {
      return NextResponse.json({ error: 'ADFS設定が見つかりません' }, { status: 404 });
    }

    if (!config.entityId) {
      return NextResponse.json({ error: 'ADFS設定が不完全です' }, { status: 400 });
    }

    const federationMetadataUrl = config.metadata?.federationMetadataUrl as string;
    const relyingPartyIdentifier = config.metadata?.relyingPartyIdentifier as string;

    if (!federationMetadataUrl || !relyingPartyIdentifier) {
      return NextResponse.json(
        { error: 'ADFSフェデレーションメタデータまたは証明書利用者識別子が設定されていません' },
        { status: 400 }
      );
    }

    // リダイレクトURIを構築
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/sso/adfs/callback`;

    // state を生成（WS-Federation では wctx として使用）
    const state = generateState();

    // プロバイダーを初期化
    const provider = new AdfsProvider({
      federationMetadataUrl,
      entityId: config.entityId,
      relyingPartyIdentifier,
      redirectUri,
      certificate: config.certificate || undefined,
    });

    // WS-Federation サインインURLを生成
    const authUrl = provider.getWsFederationSignInUrl(state);

    // state をセッションに保存
    const response = NextResponse.redirect(authUrl);

    // Cookieにstateを保存
    response.cookies.set('adfs_sso_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10分
    });

    return response;
  } catch (error) {
    console.error('ADFS認証開始エラー:', error);
    return NextResponse.json({ error: 'ADFS認証の開始に失敗しました' }, { status: 500 });
  }
}
