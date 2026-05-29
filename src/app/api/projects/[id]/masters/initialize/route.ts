/**
 * マスタ初期化 API
 * POST /api/projects/[id]/masters/initialize - 全マスタを初期化
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { initializeAllMasters } from '@/lib/repositories/master-repository';
import { projectExists } from '@/lib/repositories/project-repository';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * POST /api/projects/[id]/masters/initialize
 * プロジェクトの全マスタをデフォルト値で初期化
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    await initializeAllMasters(projectId);

    return NextResponse.json({ success: true, message: 'マスタを初期化しました。' });
  } catch (error) {
    console.error('マスタ初期化エラー:', error);
    return NextResponse.json({ error: 'マスタの初期化に失敗しました。' }, { status: 500 });
  }
}
