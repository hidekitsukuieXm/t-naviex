/**
 * SSO Callback API Route
 *
 * SSOコールバックAPIルート
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSsoConfigurationByName,
  exchangeCodeForToken,
  fetchUserInfo,
  provisionSsoUser,
  logSsoLogin,
} from '@/repositories/sso-repository';
import { isAllowedDomain } from '@/types/sso';

/**
 * SSOコールバック処理
 */
export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url);
    const code = searchParams.get('code');
    const state = searchParams.get('state');
    const error = searchParams.get('error');
    const errorDescription = searchParams.get('error_description');
    const provider = searchParams.get('provider');

    // エラーが返された場合
    if (error) {
      console.error('SSO error:', error, errorDescription);
      return NextResponse.redirect(
        new URL(
          `/auth/error?error=${encodeURIComponent(error)}&message=${encodeURIComponent(errorDescription || '')}`,
          request.url
        )
      );
    }

    // 必須パラメータチェック
    if (!code || !state || !provider) {
      return NextResponse.redirect(
        new URL(
          '/auth/error?error=invalid_request&message=Missing required parameters',
          request.url
        )
      );
    }

    // SSO設定を取得
    const config = await getSsoConfigurationByName(provider);
    if (!config) {
      return NextResponse.redirect(
        new URL('/auth/error?error=invalid_provider&message=SSO provider not found', request.url)
      );
    }

    const ipAddress = request.headers.get('x-forwarded-for') || undefined;
    const userAgent = request.headers.get('user-agent') || undefined;

    try {
      // トークン交換
      const redirectUri = `${new URL(request.url).origin}/api/sso/callback?provider=${provider}`;
      const tokens = await exchangeCodeForToken(config.id, code, redirectUri);

      // ユーザー情報取得
      const userInfo = await fetchUserInfo(config.id, tokens.accessToken);

      // ドメインチェック
      if (!isAllowedDomain(userInfo.email, config.allowedDomains || [])) {
        await logSsoLogin(config.id, false, {
          ssoUserId: userInfo.id,
          ssoEmail: userInfo.email,
          errorCode: 'DOMAIN_NOT_ALLOWED',
          errorMessage: 'メールドメインが許可されていません',
          ipAddress,
          userAgent,
        });

        return NextResponse.redirect(
          new URL(
            '/auth/error?error=domain_not_allowed&message=Email domain not allowed',
            request.url
          )
        );
      }

      // ユーザープロビジョニング
      const { userId, isNew } = await provisionSsoUser(config.id, userInfo);

      // ログイン成功ログ
      await logSsoLogin(config.id, true, {
        userId,
        ssoUserId: userInfo.id,
        ssoEmail: userInfo.email,
        ipAddress,
        userAgent,
        metadata: { isNewUser: isNew },
      });

      // セッション作成（NextAuthとの統合が必要）
      // ここでは認証成功後のリダイレクトのみ実装
      const successUrl = new URL('/auth/sso-success', request.url);
      successUrl.searchParams.set('userId', userId);
      successUrl.searchParams.set('provider', provider);

      return NextResponse.redirect(successUrl);
    } catch (err) {
      console.error('SSO callback error:', err);

      await logSsoLogin(config.id, false, {
        errorCode: 'CALLBACK_ERROR',
        errorMessage: err instanceof Error ? err.message : 'Unknown error',
        ipAddress,
        userAgent,
      });

      return NextResponse.redirect(
        new URL(
          '/auth/error?error=callback_failed&message=SSO callback processing failed',
          request.url
        )
      );
    }
  } catch (error) {
    console.error('SSO callback fatal error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=server_error&message=Internal server error', request.url)
    );
  }
}

/**
 * SSOコールバック処理（POST - SAMLアサーション用）
 */
export async function POST(request: NextRequest) {
  try {
    const formData = await request.formData();
    const samlResponse = formData.get('SAMLResponse');
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const _relayState = formData.get('RelayState');

    if (!samlResponse) {
      return NextResponse.redirect(
        new URL('/auth/error?error=invalid_saml&message=Missing SAML response', request.url)
      );
    }

    // SAML処理（簡易実装 - 実際にはsaml2-jsなどのライブラリが必要）
    // ここではスタブ実装
    return NextResponse.redirect(
      new URL(
        '/auth/error?error=saml_not_implemented&message=SAML support requires additional implementation',
        request.url
      )
    );
  } catch (error) {
    console.error('SAML callback error:', error);
    return NextResponse.redirect(
      new URL('/auth/error?error=saml_error&message=SAML processing failed', request.url)
    );
  }
}
