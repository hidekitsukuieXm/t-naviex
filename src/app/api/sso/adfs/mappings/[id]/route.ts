/**
 * ADFS Role Mapping Detail API
 *
 * 個別のADFSロールマッピング管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/sso/adfs/mappings/[id]
 * 特定のロールマッピングを取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const mapping = await prisma.ssoRoleMapping.findUnique({
      where: { id: BigInt(id) },
      include: {
        configuration: {
          select: { name: true },
        },
      },
    });

    if (!mapping) {
      return NextResponse.json({ error: 'マッピングが見つかりません' }, { status: 404 });
    }

    if (mapping.configuration.name !== 'adfs') {
      return NextResponse.json({ error: 'ADFSのマッピングではありません' }, { status: 400 });
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
 * PUT /api/sso/adfs/mappings/[id]
 * ロールマッピングを更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const { ssoGroupName, localRoleId, priority, isActive } = body;

    // 既存マッピングを確認
    const existingMapping = await prisma.ssoRoleMapping.findUnique({
      where: { id: BigInt(id) },
      include: {
        configuration: {
          select: { id: true, name: true },
        },
      },
    });

    if (!existingMapping) {
      return NextResponse.json({ error: 'マッピングが見つかりません' }, { status: 404 });
    }

    if (existingMapping.configuration.name !== 'adfs') {
      return NextResponse.json({ error: 'ADFSのマッピングではありません' }, { status: 400 });
    }

    // ローカルロールの存在確認（更新時）
    if (localRoleId) {
      const role = await prisma.role.findUnique({
        where: { id: BigInt(localRoleId) },
      });

      if (!role) {
        return NextResponse.json({ error: '指定されたロールが見つかりません' }, { status: 404 });
      }
    }

    // グループ名変更時の重複チェック
    if (ssoGroupName && ssoGroupName !== existingMapping.ssoGroupName) {
      const duplicateMapping = await prisma.ssoRoleMapping.findUnique({
        where: {
          configId_ssoGroupName: {
            configId: existingMapping.configuration.id,
            ssoGroupName,
          },
        },
      });

      if (duplicateMapping) {
        return NextResponse.json(
          { error: 'このADFSグループ/ロール名のマッピングは既に存在します' },
          { status: 409 }
        );
      }
    }

    // マッピングを更新
    const updatedMapping = await prisma.ssoRoleMapping.update({
      where: { id: BigInt(id) },
      data: {
        ...(ssoGroupName !== undefined && { ssoGroupName }),
        ...(localRoleId !== undefined && { localRoleId: BigInt(localRoleId) }),
        ...(priority !== undefined && { priority }),
        ...(isActive !== undefined && { isActive }),
      },
    });

    return NextResponse.json({
      id: updatedMapping.id.toString(),
      message: 'ロールマッピングを更新しました',
    });
  } catch (error) {
    console.error('ロールマッピング更新エラー:', error);
    return NextResponse.json({ error: 'ロールマッピングの更新に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/sso/adfs/mappings/[id]
 * ロールマッピングを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    // 既存マッピングを確認
    const existingMapping = await prisma.ssoRoleMapping.findUnique({
      where: { id: BigInt(id) },
      include: {
        configuration: {
          select: { name: true },
        },
      },
    });

    if (!existingMapping) {
      return NextResponse.json({ error: 'マッピングが見つかりません' }, { status: 404 });
    }

    if (existingMapping.configuration.name !== 'adfs') {
      return NextResponse.json({ error: 'ADFSのマッピングではありません' }, { status: 400 });
    }

    // マッピングを削除
    await prisma.ssoRoleMapping.delete({
      where: { id: BigInt(id) },
    });

    return NextResponse.json({
      message: 'ロールマッピングを削除しました',
    });
  } catch (error) {
    console.error('ロールマッピング削除エラー:', error);
    return NextResponse.json({ error: 'ロールマッピングの削除に失敗しました' }, { status: 500 });
  }
}
