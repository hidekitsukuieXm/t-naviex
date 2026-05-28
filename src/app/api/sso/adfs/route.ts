/**
 * ADFS SSO API Routes
 *
 * Active Directory Federation Services SSO認証のAPIエンドポイント
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';
import { AdfsProvider } from '@/services/sso/adfs-provider';

/**
 * GET /api/sso/adfs
 * ADFS設定を取得
 */
export async function GET() {
  try {
    const config = await prisma.ssoConfiguration.findFirst({
      where: {
        providerName: 'CUSTOM',
        name: 'adfs',
      },
      select: {
        id: true,
        name: true,
        displayName: true,
        providerType: true,
        providerName: true,
        status: true,
        entityId: true,
        ssoUrl: true,
        sloUrl: true,
        certificate: true,
        allowedDomains: true,
        autoProvision: true,
        metadata: true,
        createdAt: true,
        updatedAt: true,
      },
    });

    if (!config) {
      return NextResponse.json({ error: 'ADFS設定が見つかりません' }, { status: 404 });
    }

    return NextResponse.json(config);
  } catch (error) {
    console.error('ADFS設定取得エラー:', error);
    return NextResponse.json({ error: 'ADFS設定の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/sso/adfs
 * ADFS設定を作成または更新
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const {
      adfsServer,
      entityId,
      relyingPartyIdentifier,
      certificate,
      allowedDomains,
      autoProvision,
      defaultRoleId,
    } = body;

    // バリデーション
    if (!adfsServer || !entityId || !relyingPartyIdentifier) {
      return NextResponse.json(
        { error: 'ADFSサーバー、エンティティID、証明書利用者識別子は必須です' },
        { status: 400 }
      );
    }

    // デフォルトURLを取得
    const urls = AdfsProvider.getDefaultUrls(adfsServer);

    // 既存設定を確認
    const existingConfig = await prisma.ssoConfiguration.findFirst({
      where: { name: 'adfs' },
    });

    const configData = {
      name: 'adfs',
      displayName: 'Active Directory Federation Services (ADFS)',
      providerType: 'SAML' as const,
      providerName: 'CUSTOM' as const,
      entityId,
      ssoUrl: urls.signInUrl,
      sloUrl: urls.signOutUrl,
      certificate: certificate || null,
      allowedDomains: allowedDomains || [],
      autoProvision: autoProvision ?? true,
      defaultRoleId: defaultRoleId ? BigInt(defaultRoleId) : null,
      metadata: {
        adfsServer,
        federationMetadataUrl: urls.federationMetadataUrl,
        relyingPartyIdentifier,
      },
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
      message: existingConfig ? 'ADFS設定を更新しました' : 'ADFS設定を作成しました',
    });
  } catch (error) {
    console.error('ADFS設定保存エラー:', error);
    return NextResponse.json({ error: 'ADFS設定の保存に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/sso/adfs
 * ADFS設定を削除
 */
export async function DELETE() {
  try {
    const config = await prisma.ssoConfiguration.findFirst({
      where: { name: 'adfs' },
    });

    if (!config) {
      return NextResponse.json({ error: 'ADFS設定が見つかりません' }, { status: 404 });
    }

    await prisma.ssoConfiguration.delete({
      where: { id: config.id },
    });

    return NextResponse.json({ message: 'ADFS設定を削除しました' });
  } catch (error) {
    console.error('ADFS設定削除エラー:', error);
    return NextResponse.json({ error: 'ADFS設定の削除に失敗しました' }, { status: 500 });
  }
}
