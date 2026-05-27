/**
 * Google Workspace SSO Callback API
 *
 * Google Workspace SSO認証コールバックエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import {
  GoogleWorkspaceProvider,
  GoogleWorkspaceUserProvisioner,
} from '@/services/sso/google-workspace-provider';
import { isAllowedDomain } from '@/types/sso';

/**
 * GET /api/sso/google-workspace/callback
 * Google Workspace認証コールバック処理
 */
export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');

    // エラーチェック
    if (error) {
      console.error('Google Workspace認証エラー:', error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=google_auth_failed&message=${encodeURIComponent(error)}`
      );
    }

    if (!code) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=google_auth_failed&message=no_code`
      );
    }

    // state検証
    const savedState = request.cookies.get('google_sso_state')?.value;
    if (!state || state !== savedState) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=google_auth_failed&message=invalid_state`
      );
    }

    // Google Workspace設定を取得
    const config = await prisma.ssoConfiguration.findFirst({
      where: {
        providerName: 'GOOGLE',
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
        `${process.env.NEXTAUTH_URL}/login?error=google_auth_failed&message=config_not_found`
      );
    }

    // リダイレクトURIを構築
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/sso/google-workspace/callback`;

    // プロバイダーを初期化
    const hostedDomain = config.metadata?.hostedDomain as string | undefined;
    const provider = new GoogleWorkspaceProvider({
      clientId: config.clientId,
      clientSecret: config.clientSecret,
      redirectUri,
      hostedDomain,
    });

    // ユーザー認証
    const ssoUserInfo = await provider.authenticateUser(code);

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
          `${process.env.NEXTAUTH_URL}/login?error=google_auth_failed&message=domain_not_allowed`
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
        const localUser = GoogleWorkspaceUserProvisioner.mapToLocalUser(ssoUserInfo);

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
          const mappedRoleIds = GoogleWorkspaceUserProvisioner.mapGroupsToRoles(
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
          `${process.env.NEXTAUTH_URL}/login?error=google_auth_failed&message=user_not_found`
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
          hostedDomain: ssoUserInfo.metadata?.hostedDomain,
        },
      },
    });

    // セッション作成とリダイレクト
    // 実際の実装ではNextAuth.jsのセッション管理と統合する
    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard`);

    // セッションCookieをクリア
    response.cookies.delete('google_sso_state');
    response.cookies.delete('google_sso_nonce');

    // ここでセッションを作成する（NextAuth.jsとの統合が必要）
    // signInの呼び出しなど

    return response;
  } catch (error) {
    console.error('Google Workspaceコールバックエラー:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=google_auth_failed&message=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`
    );
  }
}
