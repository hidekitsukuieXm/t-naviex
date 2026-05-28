/**
 * ADFS SSO Callback API
 *
 * ADFS SSO認証コールバックエンドポイント
 * WS-Federation / SAML レスポンスを処理
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AdfsProvider, AdfsUserProvisioner } from '@/services/sso/adfs-provider';
import { isAllowedDomain } from '@/types/sso';

/**
 * POST /api/sso/adfs/callback
 * ADFS認証コールバック処理（WS-Federation / SAML POST binding）
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();

    // WS-Federation レスポンス
    const wresult = formData.get('wresult') as string | null;
    const wctx = formData.get('wctx') as string | null;

    // SAML レスポンス
    const samlResponse = formData.get('SAMLResponse') as string | null;
    const relayState = formData.get('RelayState') as string | null;

    // state 検証
    const savedState = request.cookies.get('adfs_sso_state')?.value;
    const receivedState = wctx || relayState;

    if (!savedState || savedState !== receivedState) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=adfs_auth_failed&message=invalid_state`
      );
    }

    // ADFS設定を取得
    const config = await prisma.ssoConfiguration.findFirst({
      where: {
        name: 'adfs',
        status: 'ACTIVE',
      },
      include: {
        roleMappings: {
          where: { isActive: true },
          orderBy: { priority: 'desc' },
        },
      },
    });

    if (!config || !config.entityId) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=adfs_auth_failed&message=config_not_found`
      );
    }

    const federationMetadataUrl = config.metadata?.federationMetadataUrl as string;
    const relyingPartyIdentifier = config.metadata?.relyingPartyIdentifier as string;

    if (!federationMetadataUrl || !relyingPartyIdentifier) {
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=adfs_auth_failed&message=config_incomplete`
      );
    }

    // リダイレクトURIを構築
    const baseUrl = process.env.NEXTAUTH_URL || 'http://localhost:3000';
    const redirectUri = `${baseUrl}/api/sso/adfs/callback`;

    // プロバイダーを初期化
    const provider = new AdfsProvider({
      federationMetadataUrl,
      entityId: config.entityId,
      relyingPartyIdentifier,
      redirectUri,
      certificate: config.certificate || undefined,
    });

    // トークン/アサーションを検証してユーザー情報を取得
    let ssoUserInfo;
    try {
      if (wresult) {
        // WS-Federation トークン
        const token = await provider.validateWsFederationToken(wresult);
        ssoUserInfo = provider.extractUserInfo(token.claims);
      } else if (samlResponse) {
        // SAML Assertion
        const assertion = await provider.validateSamlResponse(samlResponse);
        ssoUserInfo = provider.extractUserInfo(assertion.attributes);
      } else {
        throw new Error('WS-Federation トークンまたは SAML Response が見つかりません');
      }
    } catch (error) {
      console.error('ADFS トークン検証エラー:', error);
      return NextResponse.redirect(
        `${process.env.NEXTAUTH_URL}/login?error=adfs_auth_failed&message=token_validation_failed`
      );
    }

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
          `${process.env.NEXTAUTH_URL}/login?error=adfs_auth_failed&message=domain_not_allowed`
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
        const localUser = AdfsUserProvisioner.mapToLocalUser(ssoUserInfo);

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
          const mappedRoleIds = AdfsUserProvisioner.mapGroupsToRoles(
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
          `${process.env.NEXTAUTH_URL}/login?error=adfs_auth_failed&message=user_not_found`
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
          protocol: wresult ? 'WS-Federation' : 'SAML',
        },
      },
    });

    // セッション作成とリダイレクト
    const response = NextResponse.redirect(`${process.env.NEXTAUTH_URL}/dashboard`);

    // セッションCookieをクリア
    response.cookies.delete('adfs_sso_state');

    return response;
  } catch (error) {
    console.error('ADFSコールバックエラー:', error);
    return NextResponse.redirect(
      `${process.env.NEXTAUTH_URL}/login?error=adfs_auth_failed&message=${encodeURIComponent(error instanceof Error ? error.message : 'unknown_error')}`
    );
  }
}

/**
 * GET /api/sso/adfs/callback
 * ADFS認証コールバック処理（SAML HTTP-Redirect binding）
 */
export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  const samlResponse = searchParams.get('SAMLResponse');
  const relayState = searchParams.get('RelayState');

  if (samlResponse) {
    // SAML Response を POST として処理するためにリダイレクト
    const formData = new FormData();
    formData.append('SAMLResponse', samlResponse);
    if (relayState) {
      formData.append('RelayState', relayState);
    }

    // 内部的に POST を呼び出す
    const response = await POST(
      new NextRequest(request.url, {
        method: 'POST',
        headers: request.headers,
        body: formData,
      })
    );

    return response;
  }

  return NextResponse.redirect(
    `${process.env.NEXTAUTH_URL}/login?error=adfs_auth_failed&message=no_response`
  );
}
