/**
 * テンプレート並び順更新 API
 * PUT /api/projects/[id]/templates/reorder - 並び順を一括更新
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { updateTemplateSortOrders } from '@/lib/repositories/template-repository';
import { projectExists } from '@/lib/repositories/project-repository';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * PUT /api/projects/[id]/templates/reorder
 * テンプレートの並び順を一括更新
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(projectId);
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // 入力バリデーション
    if (!Array.isArray(body.orders)) {
      return NextResponse.json({ error: '並び順データが必要です。' }, { status: 400 });
    }

    for (const order of body.orders) {
      if (!order.id || typeof order.sortOrder !== 'number') {
        return NextResponse.json(
          { error: '並び順データの形式が正しくありません。' },
          { status: 400 }
        );
      }
    }

    await updateTemplateSortOrders(projectId, body.orders);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('テンプレート並び順更新エラー:', error);
    return NextResponse.json({ error: '並び順の更新に失敗しました。' }, { status: 500 });
  }
}
