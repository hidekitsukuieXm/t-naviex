/**
 * Okta SSO API Routes
 *
 * Okta SSO認証のAPIエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { OktaProvider } from '@/services/sso/okta-provider';

/**
 * GET /api/sso/okta
 * Okta設定を取得
 */
export async function GET() {
  try {
    const config = await prisma.ssoConfiguration.findFirst({
      where: {
        providerName: 'OKTA',
        status: 'ACTIVE',
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        providerType: true,
        providerName: true,
        status: true,
        clientId: true,
        authorizationUrl: true,
        tokenUrl: true,
        userInfoUrl: true,
        scopes: true,
        allowedDomains: true,
        autoProvision: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!config) {
      return NextResponse.json({ error: 'Okta設定が見つかりません' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Okta設定取得エラー:', error);
    return NextResponse.json({ error: 'Okta設定の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/sso/okta
 * Okta設定を作成または更新
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      domain,
      clientId,
      clientSecret,
      apiToken,
      allowedDomains,
      autoProvision,
      defaultRoleId,
    } = body;

    // バリデーション
    if (!domain || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'Oktaドメイン、クライアントID、クライアントシークレットは必須です' },
        { status: 400 }
      );
    }

    // デフォルトURLを取得
    const urls = OktaProvider.getDefaultUrls(domain);

    // 既存設定を確認
    const existingConfig = await prisma.ssoConfiguration.findFirst({
      where: { providerName: 'OKTA' },
    });

    const configData = {
      name: 'okta',
      displayName: 'Okta',
      providerType: 'OIDC' as const,
      providerName: 'OKTA' as const,
      clientId,
      clientSecret,
      authorizationUrl: urls.authorizationUrl,
      tokenUrl: urls.tokenUrl,
      userInfoUrl: urls.userInfoUrl,
      scopes: ['openid', 'profile', 'email', 'groups'],
      allowedDomains: allowedDomains || [],
      autoProvision: autoProvision ?? true,
      defaultRoleId: defaultRoleId ? BigInt(defaultRoleId) : null,
      metadata: { domain, apiToken },
    };

    let config;
    if (existingConfig) {
      config = await prisma.ssoConfiguration.update({
        where: { id: existingConfig.id },
        data: configData,
      });
    } else {
      config = await prisma.ssoConfiguration.create({
        data: configData,
      });
    }

    return NextResponse.json({
      id: config.id.toString(),
      message: existingConfig ? 'Okta設定を更新しました' : 'Okta設定を作成しました',
    });
  } catch (error) {
    console.error('Okta設定保存エラー:', error);
    return NextResponse.json({ error: 'Okta設定の保存に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/sso/okta
 * Okta設定を削除
 */
export async function DELETE() {
  try {
    const config = await prisma.ssoConfiguration.findFirst({
      where: { providerName: 'OKTA' },
    });

    if (!config) {
      return NextResponse.json({ error: 'Okta設定が見つかりません' }, { status: 404 });
    }

    await prisma.ssoConfiguration.delete({
      where: { id: config.id },
    });

    return NextResponse.json({ message: 'Okta設定を削除しました' });
  } catch (error) {
    console.error('Okta設定削除エラー:', error);
    return NextResponse.json({ error: 'Okta設定の削除に失敗しました' }, { status: 500 });
  }
}
