/**
 * Okta SSO Auth API
 *
 * Okta SSO認証開始エンドポイント
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OktaProvider } from '@/services/sso/okta-provider';
import { generateState, generateNonce } from '@/types/sso';

/**
 * GET /api/sso/okta/auth
 * Okta認証を開始（認可URLにリダイレクト）
 */
export async function GET() {
  try {
    // Okta設定を取得
    const config = await prisma.ssoConfiguration.findFirst({
      where: {
        providerName: 'OKTA',
        status: 'ACTIVE',
      },
    });

    if (!config) {
      return NextResponse.json({ error: 'Okta設定が見つかりません' }, { status: 404 });
    }

    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json({ error: 'Okta設定が不完全です' }, { status: 400 });
    }

    const domain = config.metadata?.domain as string;
    if (!domain) {
      return NextResponse.json({ error: 'Oktaドメインが設定されていません' }, { status: 400 });
    }

    // リダイレクトURIを構築
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/sso/okta/callback`;

    // state と nonce を生成
    const state = generateState();
    const nonce = generateNonce();

    // プロバイダーを初期化
    const provider = new OktaProvider({
      domain,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri,
    });

    // 認可URLを生成
    const authUrl = provider.getAuthorizationUrl(state, nonce);

    // state と nonce をセッションに保存
    const response = NextResponse.redirect(authUrl);

    // Cookieにstateとnonceを保存
    response.cookies.set('okta_sso_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10分
    });
    response.cookies.set('okta_sso_nonce', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10分
    });

    return response;
  } catch (error) {
    console.error('Okta認証開始エラー:', error);
    return NextResponse.json({ error: 'Okta認証の開始に失敗しました' }, { status: 500 });
  }
}
