/**
 * Azure AD SSO API Routes
 *
 * Azure Active Directory SSO認証のAPIエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AzureAdProvider } from '@/services/sso/azure-ad-provider';

/**
 * GET /api/sso/azure-ad
 * Azure AD設定を取得
 */
export async function GET() {
  try {
    const config = await prisma.ssoConfiguration.findFirst({
      where: {
        providerName: 'MICROSOFT',
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
      return NextResponse.json({ error: 'Azure AD設定が見つかりません' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Azure AD設定取得エラー:', error);
    return NextResponse.json({ error: 'Azure AD設定の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/sso/azure-ad
 * Azure AD設定を作成または更新
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { tenantId, clientId, clientSecret, allowedDomains, autoProvision, defaultRoleId } = body;

    // バリデーション
    if (!tenantId || !clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'テナントID、クライアントID、クライアントシークレットは必須です' },
        { status: 400 }
      );
    }

    // デフォルトURLを取得
    const urls = AzureAdProvider.getDefaultUrls(tenantId);

    // 既存設定を確認
    const existingConfig = await prisma.ssoConfiguration.findFirst({
      where: { providerName: 'MICROSOFT' },
    });

    const configData = {
      name: 'azure-ad',
      displayName: 'Microsoft Entra ID (Azure AD)',
      providerType: 'OIDC' as const,
      providerName: 'MICROSOFT' as const,
      clientId,
      clientSecret,
      authorizationUrl: urls.authorizationUrl,
      tokenUrl: urls.tokenUrl,
      userInfoUrl: urls.userInfoUrl,
      scopes: ['openid', 'profile', 'email', 'User.Read', 'GroupMember.Read.All'],
      allowedDomains: allowedDomains || [],
      autoProvision: autoProvision ?? true,
      defaultRoleId: defaultRoleId ? BigInt(defaultRoleId) : null,
      metadata: { tenantId },
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
      message: existingConfig ? 'Azure AD設定を更新しました' : 'Azure AD設定を作成しました',
    });
  } catch (error) {
    console.error('Azure AD設定保存エラー:', error);
    return NextResponse.json({ error: 'Azure AD設定の保存に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/sso/azure-ad
 * Azure AD設定を削除
 */
export async function DELETE() {
  try {
    const config = await prisma.ssoConfiguration.findFirst({
      where: { providerName: 'MICROSOFT' },
    });

    if (!config) {
      return NextResponse.json({ error: 'Azure AD設定が見つかりません' }, { status: 404 });
    }

    await prisma.ssoConfiguration.delete({
      where: { id: config.id },
    });

    return NextResponse.json({ message: 'Azure AD設定を削除しました' });
  } catch (error) {
    console.error('Azure AD設定削除エラー:', error);
    return NextResponse.json({ error: 'Azure AD設定の削除に失敗しました' }, { status: 500 });
  }
}
