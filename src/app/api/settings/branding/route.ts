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

    // Get or create tenant settings (singleton)
    let settings = await prisma.tenantSettings.findFirst();

    if (!settings) {
      // Create default tenant settings
      settings = await prisma.tenantSettings.create({
        data: {
          primaryColor: '#3B82F6',
          secondaryColor: '#6366F1',
          accentColor: '#8B5CF6',
        },
      });
    }

    // Map TenantSettings to branding response format
    return NextResponse.json({
      id: settings.id.toString(),
      logoUrl: settings.logo,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
      faviconUrl: settings.faviconUrl,
      customCss: settings.customCss,
      companyName: settings.companyName,
    });
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

    const data = (await request.json()) as UpdateBrandingData;

    // Validate data
    const validation = validateBrandingData(data);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // Get existing settings or create new
    let settings = await prisma.tenantSettings.findFirst();

    if (settings) {
      // Update existing settings
      settings = await prisma.tenantSettings.update({
        where: { id: settings.id },
        data: {
          logo: data.logoUrl ?? settings.logo,
          primaryColor: data.primaryColor ?? settings.primaryColor,
          secondaryColor: data.secondaryColor ?? settings.secondaryColor,
          accentColor: data.accentColor ?? settings.accentColor,
          faviconUrl: data.faviconUrl ?? settings.faviconUrl,
          customCss: data.customCss ?? settings.customCss,
        },
      });
    } else {
      // Create new settings
      settings = await prisma.tenantSettings.create({
        data: {
          logo: data.logoUrl ?? null,
          primaryColor: data.primaryColor ?? '#3B82F6',
          secondaryColor: data.secondaryColor ?? '#6366F1',
          accentColor: data.accentColor ?? '#8B5CF6',
          faviconUrl: data.faviconUrl ?? null,
          customCss: data.customCss ?? null,
        },
      });
    }

    return NextResponse.json({
      id: settings.id.toString(),
      logoUrl: settings.logo,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
      faviconUrl: settings.faviconUrl,
      customCss: settings.customCss,
      companyName: settings.companyName,
    });
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

    // Get existing settings
    const existingSettings = await prisma.tenantSettings.findFirst();

    if (existingSettings) {
      // Reset to defaults
      const settings = await prisma.tenantSettings.update({
        where: { id: existingSettings.id },
        data: {
          logo: null,
          primaryColor: '#3B82F6',
          secondaryColor: '#6366F1',
          accentColor: '#8B5CF6',
          faviconUrl: null,
          customCss: null,
        },
      });

      return NextResponse.json({
        id: settings.id.toString(),
        logoUrl: settings.logo,
        primaryColor: settings.primaryColor,
        secondaryColor: settings.secondaryColor,
        accentColor: settings.accentColor,
        faviconUrl: settings.faviconUrl,
        customCss: settings.customCss,
        companyName: settings.companyName,
      });
    }

    // Create default settings if none exist
    const settings = await prisma.tenantSettings.create({
      data: {
        primaryColor: '#3B82F6',
        secondaryColor: '#6366F1',
        accentColor: '#8B5CF6',
      },
    });

    return NextResponse.json({
      id: settings.id.toString(),
      logoUrl: settings.logo,
      primaryColor: settings.primaryColor,
      secondaryColor: settings.secondaryColor,
      accentColor: settings.accentColor,
      faviconUrl: settings.faviconUrl,
      customCss: settings.customCss,
      companyName: settings.companyName,
    });
  } catch (error) {
    console.error('Failed to reset branding settings:', error);
    return NextResponse.json(
      { error: 'ブランディング設定のリセットに失敗しました。' },
      { status: 500 }
    );
  }
}
