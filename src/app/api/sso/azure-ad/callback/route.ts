/**
 * Azure AD Callback API
 *
 * Azure AD認証コールバック処理
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AzureAdProvider, AzureAdUserProvisioner } from '@/services/sso/azure-ad-provider';
import { cookies } from 'next/headers';

/**
 * GET /api/sso/azure-ad/callback
 * Azure AD認証コールバック
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const code = searchParams.get('code');
  const state = searchParams.get('state');
  const error = searchParams.get('error');
  const errorDescription = searchParams.get('error_description');

  try {
    // エラーチェック
    if (error) {
      console.error('Azure ADエラー:', error, errorDescription);
      await logSsoAttempt(null, null, false, error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/login?error=sso_error&message=${encodeURIComponent(errorDescription || error)}`,
          request.url
        )
      );
    }

    // コードが必要
    if (!code) {
      await logSsoAttempt(null, null, false, 'missing_code', '認証コードがありません');
      return NextResponse.redirect(new URL('/login?error=missing_code', request.url));
    }

    // stateの検証（CSRF対策）
    const cookieStore = await cookies();
    const savedState = cookieStore.get('azure_ad_state')?.value;

    if (!savedState || savedState !== state) {
      await logSsoAttempt(null, null, false, 'invalid_state', 'State検証に失敗しました');
      return NextResponse.redirect(new URL('/login?error=invalid_state', request.url));
    }

    // cookieをクリア
    cookieStore.delete('azure_ad_state');
    cookieStore.delete('azure_ad_nonce');

    // アクティブなAzure AD設定を取得
    const config = await prisma.ssoConfiguration.findFirst({
      where: {
        providerName: 'MICROSOFT',
        status: 'ACTIVE',
      },
      include: {
        roleMappings: {
          where: { isActive: true },
          orderBy: { priority: 'desc' },
        },
      },
    });

    if (!config) {
      await logSsoAttempt(null, null, false, 'config_not_found', 'Azure AD設定が見つかりません');
      return NextResponse.redirect(new URL('/login?error=sso_not_configured', request.url));
    }

    // プロバイダーを初期化
    const baseUrl = process.env.NEXTAUTH_URL || request.nextUrl.origin;
    const redirectUri = `${baseUrl}/api/sso/azure-ad/callback`;
    const provider = AzureAdProvider.fromSsoConfiguration(
      {
        ...config,
        id: config.id.toString(),
        metadata: config.metadata as Record<string, unknown> | undefined,
        createdAt: config.createdAt,
        updatedAt: config.updatedAt,
      },
      redirectUri
    );

    // ユーザー情報を取得
    const ssoUserInfo = await provider.authenticateUser(code);

    // ドメイン制限チェック
    if (config.allowedDomains && config.allowedDomains.length > 0) {
      const emailDomain = ssoUserInfo.email.split('@')[1]?.toLowerCase();
      const isAllowed = config.allowedDomains.some(
        (domain) => domain.toLowerCase() === emailDomain
      );

      if (!isAllowed) {
        await logSsoAttempt(
          config.id,
          ssoUserInfo,
          false,
          'domain_not_allowed',
          `ドメイン ${emailDomain} は許可されていません`
        );
        return NextResponse.redirect(new URL('/login?error=domain_not_allowed', request.url));
      }
    }

    // 既存ユーザーを検索
    let user = await prisma.user.findUnique({
      where: { email: ssoUserInfo.email },
    });

    // 自動プロビジョニング
    if (!user && config.autoProvision) {
      const userData = AzureAdUserProvisioner.mapToLocalUser(ssoUserInfo);

      // ロールマッピング
      let roleIds: bigint[] = [];
      if (ssoUserInfo.groups && config.roleMappings.length > 0) {
        const mappedRoles = AzureAdUserProvisioner.mapGroupsToRoles(
          ssoUserInfo.groups,
          config.roleMappings.map((m) => ({
            ssoGroupName: m.ssoGroupName,
            localRoleId: m.localRoleId.toString(),
            priority: m.priority,
          }))
        );
        roleIds = mappedRoles.map((id) => BigInt(id));
      } else if (config.defaultRoleId) {
        roleIds = [config.defaultRoleId];
      }

      user = await prisma.user.create({
        data: {
          email: userData.email,
          name: userData.name,
          externalId: userData.externalId,
          status: 'ACTIVE',
          metadata: userData.metadata,
          ...(roleIds.length > 0 && {
            userRoles: {
              create: roleIds.map((roleId) => ({
                roleId,
              })),
            },
          }),
        },
      });
    }

    if (!user) {
      await logSsoAttempt(
        config.id,
        ssoUserInfo,
        false,
        'user_not_found',
        'ユーザーが見つからず、自動プロビジョニングも無効です'
      );
      return NextResponse.redirect(new URL('/login?error=user_not_found', request.url));
    }

    // ユーザーがアクティブかチェック
    if (user.status !== 'ACTIVE') {
      await logSsoAttempt(
        config.id,
        ssoUserInfo,
        false,
        'user_inactive',
        'ユーザーアカウントが無効です'
      );
      return NextResponse.redirect(new URL('/login?error=user_inactive', request.url));
    }

    // ログイン成功をログ
    await logSsoAttempt(config.id, ssoUserInfo, true, null, null, user.id);

    // 最終ログイン時刻を更新
    await prisma.user.update({
      where: { id: user.id },
      data: { lastLoginAt: new Date() },
    });

    // セッションを作成（JWTトークンを発行）
    // NextAuth.jsのcredentialsプロバイダーを使ってログイン
    const response = NextResponse.redirect(new URL('/dashboard', request.url));

    // SSO経由のログインセッションを設定
    response.cookies.set('sso_user_id', user.id.toString(), {
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
      sameSite: 'lax',
      maxAge: 86400, // 24時間
      path: '/',
    });

    return response;
  } catch (error) {
    console.error('Azure ADコールバックエラー:', error);
    await logSsoAttempt(
      null,
      null,
      false,
      'callback_error',
      error instanceof Error ? error.message : 'Unknown error'
    );
    return NextResponse.redirect(new URL('/login?error=sso_callback_error', request.url));
  }
}

/**
 * SSOログイン試行をログに記録
 */
async function logSsoAttempt(
  configId: bigint | null,
  ssoUserInfo: { id: string; email: string } | null,
  success: boolean,
  errorCode: string | null,
  errorMessage: string | null,
  userId?: bigint
) {
  try {
    // アクティブな設定を取得（configIdがnullの場合）
    let actualConfigId = configId;
    if (!actualConfigId) {
      const config = await prisma.ssoConfiguration.findFirst({
        where: { providerName: 'MICROSOFT' },
        select: { id: true },
      });
      actualConfigId = config?.id || null;
    }

    if (actualConfigId) {
      await prisma.ssoLoginLog.create({
        data: {
          configId: actualConfigId,
          userId: userId || null,
          ssoUserId: ssoUserInfo?.id || null,
          ssoEmail: ssoUserInfo?.email || null,
          success,
          errorCode,
          errorMessage,
        },
      });
    }
  } catch (logError) {
    console.error('SSOログ記録エラー:', logError);
  }
}
