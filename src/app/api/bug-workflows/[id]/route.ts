import { NextRequest, NextResponse } from 'next/server';
import {
  getBugWorkflowById,
  updateBugWorkflow,
  deleteBugWorkflow,
} from '@/repositories/bug-workflow-repository';
import { validateUpdateBugWorkflow } from '@/types/bug-workflow';
import { serializeBigInt } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const workflow = await getBugWorkflowById(BigInt(id));

    if (!workflow) {
      return NextResponse.json({ error: 'ワークフローが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(serializeBigInt(workflow));
  } catch (error) {
    console.error('Error fetching workflow:', error);
    return NextResponse.json({ error: 'ワークフローの取得に失敗しました。' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateUpdateBugWorkflow(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const existing = await getBugWorkflowById(BigInt(id));
    if (!existing) {
      return NextResponse.json({ error: 'ワークフローが見つかりません。' }, { status: 404 });
    }

    const workflow = await updateBugWorkflow(BigInt(id), validation.data);
    return NextResponse.json(serializeBigInt(workflow));
  } catch (error) {
    console.error('Error updating workflow:', error);
    return NextResponse.json({ error: 'ワークフローの更新に失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await getBugWorkflowById(BigInt(id));
    if (!existing) {
      return NextResponse.json({ error: 'ワークフローが見つかりません。' }, { status: 404 });
    }

    // System-wide default cannot be deleted
    if (existing.projectId === null && existing.isDefault) {
      return NextResponse.json(
        { error: 'システムデフォルトのワークフローは削除できません。' },
        { status: 400 }
      );
    }

    await deleteBugWorkflow(BigInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting workflow:', error);
    return NextResponse.json({ error: 'ワークフローの削除に失敗しました。' }, { status: 500 });
  }
}
