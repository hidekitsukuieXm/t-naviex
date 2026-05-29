/**
 * Google Workspace SSO Auth API
 *
 * Google Workspace SSO認証開始エンドポイント
 */

import { NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleWorkspaceProvider } from '@/services/sso/google-workspace-provider';
import { generateState, generateNonce } from '@/types/sso';

/**
 * GET /api/sso/google-workspace/auth
 * Google Workspace認証を開始（認可URLにリダイレクト）
 */
export async function GET() {
  try {
    // Google Workspace設定を取得
    const config = await prisma.ssoConfiguration.findFirst({
      where: {
        providerName: 'GOOGLE',
        status: 'ACTIVE',
      },
    });

    if (!config) {
      return NextResponse.json({ error: 'Google Workspace設定が見つかりません' }, { status: 404 });
    }

    if (!config.clientId || !config.clientSecret) {
      return NextResponse.json({ error: 'Google Workspace設定が不完全です' }, { status: 400 });
    }

    // リダイレクトURIを構築
    const baseUrl = process.env['NEXTAUTH_URL'] || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/sso/google-workspace/callback`;

    // state と nonce を生成
    const state = generateState();
    const nonce = generateNonce();

    // プロバイダーを初期化
    const metadata = config.metadata as Record<string, unknown> | null;
    const hostedDomain = metadata?.['hostedDomain'] as string | undefined;
    const provider = new GoogleWorkspaceProvider({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri,
      hostedDomain,
    });

    // 認可URLを生成
    const authUrl = provider.getAuthorizationUrl(state, nonce);

    // state と nonce をセッションに保存（実際の実装ではセキュアなセッション管理が必要）
    const response = NextResponse.redirect(authUrl);

    // Cookieにstateとnonceを保存
    response.cookies.set('google_sso_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10分
    });
    response.cookies.set('google_sso_nonce', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10分
    });

    return response;
  } catch (error) {
    console.error('Google Workspace認証開始エラー:', error);
    return NextResponse.json(
      { error: 'Google Workspace認証の開始に失敗しました' },
      { status: 500 }
    );
  }
}
