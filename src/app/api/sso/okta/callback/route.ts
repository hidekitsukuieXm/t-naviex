/**
 * Okta SSO Callback API
 *
 * Okta SSO認証コールバックエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OktaProvider, OktaUserProvisioner } from '@/services/sso/okta-provider';
import { isAllowedDomain } from '@/types/sso';

/**
 * GET /api/sso/okta/callback
 * Okta認証コールバック処理
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // エラーチェック
    if (error) {
      console.error('Okta認証エラー:', error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=okta_auth_failed&message=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=okta_auth_failed&message=no_code`
      );
    }

    // state検証
    const savedState = request.cookies.get('okta_sso_state')?.value;
    if (!state || state !== savedState) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=okta_auth_failed&message=invalid_state`
      );
    }

    // Okta設定を取得
    const config = await prisma.ssoConfiguration.findFirst({
      where: {
        providerName: 'OKTA',
        status: 'ACTIVE',
      },
      include: {
        roleMappings: {
          where: { isActive: true },
          orderBy: { priority: 'desc' },
        },
      },
    });

    if (!config || !config.clientId || !config.clientSecret) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=okta_auth_failed&message=config_not_found`
      );
    }

    const domain = config.metadata?.domain as string;
    const apiToken = config.metadata?.apiToken as string | undefined;

    if (!domain) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=okta_auth_failed&message=domain_not_found`
      );
    }

    // リダイレクトURIを構築
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/sso/okta/callback`;

    // プロバイダーを初期化
    const provider = new OktaProvider({
      domain,
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri,
    });

    // ユーザー認証
    const ssoUserInfo = await provider.authenticateUser(code, apiToken);

    // ドメイン検証
    if (config.allowedDomains.length > 0) {
      if (!isAllowedDomain(ssoUserInfo.email, config.allowedDomains)) {
        // ログインログ記録
        await prisma.ssoLoginLog.create({
          data: {
            configId: config.id,
            ssoUserId: ssoUserInfo.id,
            ssoEmail: ssoUserInfo.email,
            success: false,
            errorCode: 'DOMAIN_NOT_ALLOWED',
            errorMessage: '許可されていないドメインです',
            ipAddress: request.headers.get('x-forwarded-for') || request.ip || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
          },
        });

        return NextResponse.redirect(
          `${process.env.NEXTAUTH_URL}/login?error=okta_auth_failed&message=domain_not_allowed`
        );
      }
    }

    // ユーザーを検索または作成
    let user = await prisma.user.findUnique({
      where: { email: ssoUserInfo.email },
    });

    if (!user) {
      if (config.autoProvision) {
        // 新規ユーザーを作成
        const localUser = OktaUserProvisioner.mapToLocalUser(ssoUserInfo);

        user = await prisma.user.create({
          data: {
            email: localUser.email,
            name: localUser.name,
            status: 'ACTIVE',
            emailVerified: new Date(),
          },
        });

        // ロールマッピングを適用
        if (ssoUserInfo.groups && config.roleMappings.length > 0) {
          const mappedRoleIds = OktaUserProvisioner.mapGroupsToRoles(
            ssoUserInfo.groups,
            config.roleMappings.map((m) => ({
              ssoGroupName: m.ssoGroupName,
              localRoleId: m.localRoleId.toString(),
              priority: m.priority,
            }))
          );

          // デフォルトロールを追加
          if (config.defaultRoleId && !mappedRoleIds.includes(config.defaultRoleId.toString())) {
            mappedRoleIds.push(config.defaultRoleId.toString());
          }

          // ここでプロジェクトメンバーシップやユーザーグループを設定
          // 実装はプロジェクト要件に応じて調整
        }
      } else {
        // ユーザー自動作成が無効
        await prisma.ssoLoginLog.create({
          data: {
            configId: config.id,
            ssoUserId: ssoUserInfo.id,
            ssoEmail: ssoUserInfo.email,
            success: false,
            errorCode: 'USER_NOT_FOUND',
            errorMessage: 'ユーザーが見つかりません',
            ipAddress: request.headers.get('x-forwarded-for') || request.ip || undefined,
            userAgent: request.headers.get('user-agent') || undefined,
          },
        });

        return NextResponse.redirect(
          `${process.env.NEXTAUTH_URL}/login?error=okta_auth_failed&message=user_not_found`
        );
      }
    }

    // ログインログ記録
    await prisma.ssoLoginLog.create({
      data: {
        configId: config.id,
        userId: user.id,
        ssoUserId: ssoUserInfo.id,
        ssoEmail: ssoUserInfo.email,
        success: true,
        ipAddress: request.headers.get('x-forwarded-for') || request.ip || undefined,
        userAgent: request.headers.get('user-agent') || undefined,
        metadata: {
          groups: ssoUserInfo.groups,
          domain,
        },
      },
    });

    // セッション作成とリダイレクト
    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard`);

    // セッションCookieをクリア
    response.cookies.delete('okta_sso_state');
    response.cookies.delete('okta_sso_nonce');

    return response;
  } catch (error) {
    console.error('Oktaコールバックエラー:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=okta_auth_failed&message=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`
    );
  }
}
