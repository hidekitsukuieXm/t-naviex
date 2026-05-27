/**
 * Azure AD Role Mapping CRUD API
 *
 * 個別のロールマッピング操作
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/sso/azure-ad/mappings/[id]
 * 特定のロールマッピングを取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const mappingId = BigInt(id);

    const mapping = await prisma.ssoRoleMapping.findUnique({
      where: { id: mappingId },
      include: {
        configuration: {
          select: { providerName: true },
        },
      },
    });

    if (!mapping || mapping.configuration.providerName !== 'MICROSOFT') {
      return NextResponse.json({ error: 'ロールマッピングが見つかりません' }, { status: 404 });
    }

    // ローカルロール情報を取得
    const role = await prisma.role.findUnique({
      where: { id: mapping.localRoleId },
      select: { id: true, name: true, displayName: true },
    });

    return NextResponse.json({
      id: mapping.id.toString(),
      ssoGroupName: mapping.ssoGroupName,
      localRoleId: mapping.localRoleId.toString(),
      localRoleName: role?.displayName || role?.name || 'Unknown',
      priority: mapping.priority,
      isActive: mapping.isActive,
      createdAt: mapping.createdAt,
      updatedAt: mapping.updatedAt,
    });
  } catch (error) {
    console.error('ロールマッピング取得エラー:', error);
    return NextResponse.json({ error: 'ロールマッピングの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * PUT /api/sso/azure-ad/mappings/[id]
 * ロールマッピングを更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const mappingId = BigInt(id);
    const body = await request.json();
    const { ssoGroupName, localRoleId, priority, isActive } = body;

    // 既存マッピングを確認
    const existing = await prisma.ssoRoleMapping.findUnique({
      where: { id: mappingId },
      include: {
        configuration: {
          select: { id: true, providerName: true },
        },
      },
    });

    if (!existing || existing.configuration.providerName !== 'MICROSOFT') {
      return NextResponse.json({ error: 'ロールマッピングが見つかりません' }, { status: 404 });
    }

    // ローカルロールの存在確認（変更がある場合）
    if (localRoleId) {
      const role = await prisma.role.findUnique({
        where: { id: BigInt(localRoleId) },
      });

      if (!role) {
        return NextResponse.json({ error: '指定されたロールが見つかりません' }, { status: 404 });
      }
    }

    // SSOグループ名の重複チェック（変更がある場合）
    if (ssoGroupName && ssoGroupName !== existing.ssoGroupName) {
      const duplicate = await prisma.ssoRoleMapping.findUnique({
        where: {
          configId_ssoGroupName: {
            configId: existing.configId,
            ssoGroupName,
          },
        },
      });

      if (duplicate) {
        return NextResponse.json(
          { error: 'このSSOグループ名のマッピングは既に存在します' },
          { status: 409 }
        );
      }
    }

    // マッピングを更新
    const updated = await prisma.ssoRoleMapping.update({
      where: { id: mappingId },
      data: {
        ...(ssoGroupName !== undefined && { ssoGroupName }),
        ...(localRoleId !== undefined && { localRoleId: BigInt(localRoleId) }),
        ...(priority !== undefined && { priority }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      id: updated.id.toString(),
      message: 'ロールマッピングを更新しました',
    });
  } catch (error) {
    console.error('ロールマッピング更新エラー:', error);
    return NextResponse.json({ error: 'ロールマッピングの更新に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/sso/azure-ad/mappings/[id]
 * ロールマッピングを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const mappingId = BigInt(id);

    // 既存マッピングを確認
    const existing = await prisma.ssoRoleMapping.findUnique({
      where: { id: mappingId },
      include: {
        configuration: {
          select: { providerName: true },
        },
      },
    });

    if (!existing || existing.configuration.providerName !== 'MICROSOFT') {
      return NextResponse.json({ error: 'ロールマッピングが見つかりません' }, { status: 404 });
    }

    // マッピングを削除
    await prisma.ssoRoleMapping.delete({
      where: { id: mappingId },
    });

    return NextResponse.json({ message: 'ロールマッピングを削除しました' });
  } catch (error) {
    console.error('ロールマッピング削除エラー:', error);
    return NextResponse.json({ error: 'ロールマッピングの削除に失敗しました' }, { status: 500 });
  }
}
