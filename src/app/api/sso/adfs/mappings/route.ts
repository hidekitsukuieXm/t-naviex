/**
 * ADFS Role Mappings API
 *
 * ADFSグループ/ロールとローカルロールのマッピング管理
 */

import { NextRequest, NextResponse } from 'next/server';
import { prisma } from '@/lib/prisma';

/**
 * GET /api/sso/adfs/mappings
 * ADFSロールマッピング一覧を取得
 */
export async function GET() {
  try {
    // ADFS設定を取得
    const config = await prisma.ssoConfiguration.findFirst({
      where: { name: 'adfs' },
      include: {
        roleMappings: {
          orderBy: { priority: 'desc' },
        },
      },
    });

    if (!config) {
      return NextResponse.json({ error: 'ADFS設定が見つかりません' }, { status: 404 });
    }

    // ローカルロール情報を付加
    const mappingsWithRoles = await Promise.all(
      config.roleMappings.map(async (mapping) => {
        const role = await prisma.role.findUnique({
          where: { id: mapping.localRoleId },
          select: { id: true, name: true, displayName: true },
        });

        return {
          id: mapping.id.toString(),
          ssoGroupName: mapping.ssoGroupName,
          localRoleId: mapping.localRoleId.toString(),
          localRoleName: role?.displayName || role?.name || 'Unknown',
          priority: mapping.priority,
          isActive: mapping.isActive,
          createdAt: mapping.createdAt,
          updatedAt: mapping.updatedAt,
        };
      })
    );

    return NextResponse.json(mappingsWithRoles);
  } catch (error) {
    console.error('ロールマッピング取得エラー:', error);
    return NextResponse.json({ error: 'ロールマッピングの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/sso/adfs/mappings
 * ADFSロールマッピングを作成
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { ssoGroupName, localRoleId, priority = 0 } = body;

    // バリデーション
    if (!ssoGroupName || !localRoleId) {
      return NextResponse.json(
        { error: 'ADFSグループ/ロール名とローカルロールIDは必須です' },
        { status: 400 }
      );
    }

    // ADFS設定を取得
    const config = await prisma.ssoConfiguration.findFirst({
      where: { name: 'adfs' },
    });

    if (!config) {
      return NextResponse.json({ error: 'ADFS設定が見つかりません' }, { status: 404 });
    }

    // ローカルロールの存在確認
    const role = await prisma.role.findUnique({
      where: { id: BigInt(localRoleId) },
    });

    if (!role) {
      return NextResponse.json({ error: '指定されたロールが見つかりません' }, { status: 404 });
    }

    // 既存マッピングの確認
    const existingMapping = await prisma.ssoRoleMapping.findUnique({
      where: {
        configId_ssoGroupName: {
          configId: config.id,
          ssoGroupName,
        },
      },
    });

    if (existingMapping) {
      return NextResponse.json(
        { error: 'このADFSグループ/ロール名のマッピングは既に存在します' },
        { status: 409 }
      );
    }

    // マッピングを作成
    const mapping = await prisma.ssoRoleMapping.create({
      data: {
        configId: config.id,
        ssoGroupName,
        localRoleId: BigInt(localRoleId),
        priority,
        isActive: true,
      },
    });

    return NextResponse.json({
      id: mapping.id.toString(),
      message: 'ロールマッピングを作成しました',
    });
  } catch (error) {
    console.error('ロールマッピング作成エラー:', error);
    return NextResponse.json({ error: 'ロールマッピングの作成に失敗しました' }, { status: 500 });
  }
}
