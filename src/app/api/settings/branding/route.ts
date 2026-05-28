import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { type UpdateBrandingData, validateBrandingData } from '@/types/branding';

// GET /api/settings/branding - Get branding settings
export async function GET() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: '組織が見つかりません。' }, { status: 404 });
    }

    // Get or create branding settings
    let branding = await prisma.brandingSettings.findUnique({
      where: { organizationId: user.organizationId },
    });

    if (!branding) {
      // Create default branding settings
      branding = await prisma.brandingSettings.create({
        data: {
          organizationId: user.organizationId,
          primaryColor: '#3b82f6',
        },
      });
    }

    return NextResponse.json(branding);
  } catch (error) {
    console.error('Failed to get branding settings:', error);
    return NextResponse.json(
      { error: 'ブランディング設定の取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// PUT /api/settings/branding - Update branding settings
export async function PUT(request: NextRequest) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: '組織が見つかりません。' }, { status: 404 });
    }

    // Check admin permission
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'ブランディング設定の変更には管理者権限が必要です。' },
        { status: 403 }
      );
    }

    const data = (await request.json()) as UpdateBrandingData;

    // Validate data
    const validation = validateBrandingData(data);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // Update or create branding settings
    const branding = await prisma.brandingSettings.upsert({
      where: { organizationId: user.organizationId },
      create: {
        organizationId: user.organizationId,
        logoUrl: data.logoUrl ?? null,
        logoLightUrl: data.logoLightUrl ?? null,
        logoDarkUrl: data.logoDarkUrl ?? null,
        faviconUrl: data.faviconUrl ?? null,
        primaryColor: data.primaryColor ?? '#3b82f6',
        secondaryColor: data.secondaryColor ?? null,
        accentColor: data.accentColor ?? null,
        fontFamily: data.fontFamily ?? null,
        customCss: data.customCss ?? null,
      },
      update: {
        logoUrl: data.logoUrl,
        logoLightUrl: data.logoLightUrl,
        logoDarkUrl: data.logoDarkUrl,
        faviconUrl: data.faviconUrl,
        primaryColor: data.primaryColor,
        secondaryColor: data.secondaryColor,
        accentColor: data.accentColor,
        fontFamily: data.fontFamily,
        customCss: data.customCss,
      },
    });

    return NextResponse.json(branding);
  } catch (error) {
    console.error('Failed to update branding settings:', error);
    return NextResponse.json(
      { error: 'ブランディング設定の更新に失敗しました。' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/branding - Reset branding to defaults
export async function DELETE() {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    // Get user's organization
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: { organization: true },
    });

    if (!user?.organizationId) {
      return NextResponse.json({ error: '組織が見つかりません。' }, { status: 404 });
    }

    // Check admin permission
    if (user.role !== 'ADMIN' && user.role !== 'OWNER') {
      return NextResponse.json(
        { error: 'ブランディング設定のリセットには管理者権限が必要です。' },
        { status: 403 }
      );
    }

    // Reset to defaults
    const branding = await prisma.brandingSettings.upsert({
      where: { organizationId: user.organizationId },
      create: {
        organizationId: user.organizationId,
        primaryColor: '#3b82f6',
      },
      update: {
        logoUrl: null,
        logoLightUrl: null,
        logoDarkUrl: null,
        faviconUrl: null,
        primaryColor: '#3b82f6',
        secondaryColor: null,
        accentColor: null,
        fontFamily: null,
        customCss: null,
      },
    });

    return NextResponse.json(branding);
  } catch (error) {
    console.error('Failed to reset branding settings:', error);
    return NextResponse.json(
      { error: 'ブランディング設定のリセットに失敗しました。' },
      { status: 500 }
    );
  }
}
