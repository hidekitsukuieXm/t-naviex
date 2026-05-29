/**
 * Azure AD Auth Initiation API
 *
 * Azure AD認証フローを開始するエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AzureAdProvider } from '@/services/sso/azure-ad-provider';
import { generateState, generateNonce } from '@/types/sso';
import { cookies } from 'next/headers';

/**
 * GET /api/sso/azure-ad/auth
 * Azure AD認証フローを開始
 */
export async function GET(request: NextRequest) {
  try {
    // アクティブなAzure AD設定を取得
    const config = await prisma.ssoConfiguration.findFirst({
      where: {
        providerName: 'MICROSOFT',
        status: 'ACTIVE',
      },
    });

    if (!config) {
      return NextResponse.redirect(new URL('/login?error=sso_not_configured', request.url));
    }

    // リダイレクトURIを構築
    const baseUrl = process.env['NEXTAUTH_URL'] || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/sso/azure-ad/callback`;

    // プロバイダーを初期化
    const ssoConfig = {
      id: config.id.toString(),
      name: config.name,
      displayName: config.displayName,
      providerType: config.providerType,
      providerName: config.providerName,
      status: config.status,
      clientId: config.clientId ?? undefined,
      clientSecret: config.clientSecret ?? undefined,
      authorizationUrl: config.authorizationUrl ?? undefined,
      tokenUrl: config.tokenUrl ?? undefined,
      userInfoUrl: config.userInfoUrl ?? undefined,
      scopes: config.scopes ?? undefined,
      entityId: config.entityId ?? undefined,
      ssoUrl: config.ssoUrl ?? undefined,
      sloUrl: config.sloUrl ?? undefined,
      certificate: config.certificate ?? undefined,
      privateKey: config.privateKey ?? undefined,
      allowedDomains: config.allowedDomains ?? undefined,
      autoProvision: config.autoProvision,
      defaultRoleId: config.defaultRoleId?.toString() ?? undefined,
      metadata: config.metadata as Record<string, unknown> | undefined,
      createdAt: config.createdAt,
      updatedAt: config.updatedAt,
    };
    const provider = AzureAdProvider.fromSsoConfiguration(ssoConfig, redirectUri);

    // stateとnonceを生成
    const state = generateState();
    const nonce = generateNonce();

    // stateとnonceをcookieに保存（CSRF対策）
    const cookieStore = await cookies();
    cookieStore.set('azure_ad_state', state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10分
      path: '/',
    });
    cookieStore.set('azure_ad_nonce', nonce, {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 600, // 10分
      path: '/',
    });

    // 認可URLを生成してリダイレクト
    const authUrl = provider.getAuthorizationUrl(state, nonce);
    return NextResponse.redirect(authUrl);
  } catch (error) {
    console.error('Azure AD認証開始エラー:', error);
    return NextResponse.redirect(new URL('/login?error=sso_error', request.url));
  }
}
