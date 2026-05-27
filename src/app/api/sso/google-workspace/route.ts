/**
 * Google Workspace SSO API Routes
 *
 * Google Workspace SSO認証のAPIエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { GoogleWorkspaceProvider } from '@/services/sso/google-workspace-provider';

/**
 * GET /api/sso/google-workspace
 * Google Workspace設定を取得
 */
export async function GET() {
  try {
    const config = await prisma.ssoConfiguration.findFirst({
      where: {
        providerName: 'GOOGLE',
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
      return NextResponse.json({ error: 'Google Workspace設定が見つかりません' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('Google Workspace設定取得エラー:', error);
    return NextResponse.json(
      { error: 'Google Workspace設定の取得に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * POST /api/sso/google-workspace
 * Google Workspace設定を作成または更新
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { clientId, clientSecret, hostedDomain, allowedDomains, autoProvision, defaultRoleId } =
      body;

    // バリデーション
    if (!clientId || !clientSecret) {
      return NextResponse.json(
        { error: 'クライアントID、クライアントシークレットは必須です' },
        { status: 400 }
      );
    }

    // デフォルトURLを取得
    const urls = GoogleWorkspaceProvider.getDefaultUrls();

    // 既存設定を確認
    const existingConfig = await prisma.ssoConfiguration.findFirst({
      where: { providerName: 'GOOGLE' },
    });

    const configData = {
      name: 'google-workspace',
      displayName: 'Google Workspace',
      providerType: 'OIDC' as const,
      providerName: 'GOOGLE' as const,
      clientId,
      clientSecret,
      authorizationUrl: urls.authorizationUrl,
      tokenUrl: urls.tokenUrl,
      userInfoUrl: urls.userInfoUrl,
      scopes: ['openid', 'profile', 'email'],
      allowedDomains: allowedDomains || [],
      autoProvision: autoProvision ?? true,
      defaultRoleId: defaultRoleId ? BigInt(defaultRoleId) : null,
      metadata: { hostedDomain },
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
      message: existingConfig
        ? 'Google Workspace設定を更新しました'
        : 'Google Workspace設定を作成しました',
    });
  } catch (error) {
    console.error('Google Workspace設定保存エラー:', error);
    return NextResponse.json(
      { error: 'Google Workspace設定の保存に失敗しました' },
      { status: 500 }
    );
  }
}

/**
 * DELETE /api/sso/google-workspace
 * Google Workspace設定を削除
 */
export async function DELETE() {
  try {
    const config = await prisma.ssoConfiguration.findFirst({
      where: { providerName: 'GOOGLE' },
    });

    if (!config) {
      return NextResponse.json({ error: 'Google Workspace設定が見つかりません' }, { status: 404 });
    }

    await prisma.ssoConfiguration.delete({
      where: { id: config.id },
    });

    return NextResponse.json({ message: 'Google Workspace設定を削除しました' });
  } catch (error) {
    console.error('Google Workspace設定削除エラー:', error);
    return NextResponse.json(
      { error: 'Google Workspace設定の削除に失敗しました' },
      { status: 500 }
    );
  }
}
