/**
 * SSO Role Mappings API Route
 *
 * SSOロールマッピングAPIルート
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getSsoConfiguration,
  getRoleMappings,
  createRoleMapping,
  updateRoleMapping,
  deleteRoleMapping,
} from '@/repositories/sso-repository';

interface RouteParams {
  params: Promise<{ configId: string }>;
}

/**
 * ロールマッピング一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { configId } = await params;

    const config = await getSsoConfiguration(configId);
    if (!config) {
      return NextResponse.json({ error: 'SSO設定が見つかりません' }, { status: 404 });
    }

    const mappings = await getRoleMappings(configId);

    return NextResponse.json({ mappings });
  } catch (error) {
    console.error('Failed to get role mappings:', error);
    return NextResponse.json({ error: 'ロールマッピングの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * ロールマッピングを作成
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { configId } = await params;
    const body = await request.json();

    const config = await getSsoConfiguration(configId);
    if (!config) {
      return NextResponse.json({ error: 'SSO設定が見つかりません' }, { status: 404 });
    }

    const { ssoGroupName, localRoleId, priority } = body;

    if (!ssoGroupName || !localRoleId) {
      return NextResponse.json(
        { error: 'ssoGroupName and localRoleId are required' },
        { status: 400 }
      );
    }

    const mapping = await createRoleMapping(configId, {
      ssoGroupName,
      localRoleId,
      priority,
    });

    return NextResponse.json(mapping, { status: 201 });
  } catch (error) {
    console.error('Failed to create role mapping:', error);

    // 重複エラーの処理
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: '同じグループ名のマッピングが既に存在します' },
        { status: 409 }
      );
    }

    return NextResponse.json({ error: 'ロールマッピングの作成に失敗しました' }, { status: 500 });
  }
}

/**
 * ロールマッピングを更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { configId } = await params;
    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('mappingId');
    const body = await request.json();

    if (!mappingId) {
      return NextResponse.json({ error: 'mappingId is required' }, { status: 400 });
    }

    const config = await getSsoConfiguration(configId);
    if (!config) {
      return NextResponse.json({ error: 'SSO設定が見つかりません' }, { status: 404 });
    }

    const mapping = await updateRoleMapping(mappingId, body);

    return NextResponse.json(mapping);
  } catch (error) {
    console.error('Failed to update role mapping:', error);
    return NextResponse.json({ error: 'ロールマッピングの更新に失敗しました' }, { status: 500 });
  }
}

/**
 * ロールマッピングを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { configId } = await params;
    const { searchParams } = new URL(request.url);
    const mappingId = searchParams.get('mappingId');

    if (!mappingId) {
      return NextResponse.json({ error: 'mappingId is required' }, { status: 400 });
    }

    const config = await getSsoConfiguration(configId);
    if (!config) {
      return NextResponse.json({ error: 'SSO設定が見つかりません' }, { status: 404 });
    }

    const success = await deleteRoleMapping(mappingId);

    if (!success) {
      return NextResponse.json({ error: 'ロールマッピングが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete role mapping:', error);
    return NextResponse.json({ error: 'ロールマッピングの削除に失敗しました' }, { status: 500 });
  }
}
