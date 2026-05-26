import { NextRequest, NextResponse } from 'next/server';
import {
  getBugWorkflowById,
  getBugWorkflowTransitions,
  createBugWorkflowTransition,
} from '@/repositories/bug-workflow-repository';
import { validateCreateBugWorkflowTransition } from '@/types/bug-workflow';
import { serializeBigInt } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const workflowId = BigInt(id);

    const workflow = await getBugWorkflowById(workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'ワークフローが見つかりません。' }, { status: 404 });
    }

    const transitions = await getBugWorkflowTransitions(workflowId);
    return NextResponse.json(serializeBigInt({ transitions }));
  } catch (error) {
    console.error('Error fetching transitions:', error);
    return NextResponse.json({ error: '遷移の取得に失敗しました。' }, { status: 500 });
  }
}

export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const workflowId = BigInt(id);

    const workflow = await getBugWorkflowById(workflowId);
    if (!workflow) {
      return NextResponse.json({ error: 'ワークフローが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();
    const validation = validateCreateBugWorkflowTransition({
      ...body,
      workflowId,
    });

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const transition = await createBugWorkflowTransition(validation.data);
    return NextResponse.json(serializeBigInt(transition), { status: 201 });
  } catch (error) {
    console.error('Error creating transition:', error);
    return NextResponse.json({ error: '遷移の作成に失敗しました。' }, { status: 500 });
  }
}
