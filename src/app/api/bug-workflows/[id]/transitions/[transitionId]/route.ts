import { NextRequest, NextResponse } from 'next/server';
import {
  getBugWorkflowById,
  getBugWorkflowTransitionById,
  updateBugWorkflowTransition,
  deleteBugWorkflowTransition,
} from '@/repositories/bug-workflow-repository';
import { validateUpdateBugWorkflowTransition } from '@/types/bug-workflow';
import { serializeBigInt } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string; transitionId: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, transitionId } = await params;

    const workflow = await getBugWorkflowById(BigInt(id));
    if (!workflow) {
      return NextResponse.json({ error: 'ワークフローが見つかりません。' }, { status: 404 });
    }

    const transition = await getBugWorkflowTransitionById(BigInt(transitionId));
    if (!transition) {
      return NextResponse.json({ error: '遷移が見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(serializeBigInt(transition));
  } catch (error) {
    console.error('Error fetching transition:', error);
    return NextResponse.json({ error: '遷移の取得に失敗しました。' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, transitionId } = await params;

    const workflow = await getBugWorkflowById(BigInt(id));
    if (!workflow) {
      return NextResponse.json({ error: 'ワークフローが見つかりません。' }, { status: 404 });
    }

    const existing = await getBugWorkflowTransitionById(BigInt(transitionId));
    if (!existing) {
      return NextResponse.json({ error: '遷移が見つかりません。' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateUpdateBugWorkflowTransition(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const transition = await updateBugWorkflowTransition(BigInt(transitionId), validation.data);
    return NextResponse.json(serializeBigInt(transition));
  } catch (error) {
    console.error('Error updating transition:', error);
    return NextResponse.json({ error: '遷移の更新に失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id, transitionId } = await params;

    const workflow = await getBugWorkflowById(BigInt(id));
    if (!workflow) {
      return NextResponse.json({ error: 'ワークフローが見つかりません。' }, { status: 404 });
    }

    const existing = await getBugWorkflowTransitionById(BigInt(transitionId));
    if (!existing) {
      return NextResponse.json({ error: '遷移が見つかりません。' }, { status: 404 });
    }

    await deleteBugWorkflowTransition(BigInt(transitionId));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting transition:', error);
    return NextResponse.json({ error: '遷移の削除に失敗しました。' }, { status: 500 });
  }
}
