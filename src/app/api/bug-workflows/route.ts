import { NextRequest, NextResponse } from 'next/server';
import { getBugWorkflows, createBugWorkflow } from '@/repositories/bug-workflow-repository';
import { validateCreateBugWorkflow } from '@/types/bug-workflow';
import { serializeBigInt } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectIdStr = searchParams.get('projectId');
    const projectId = projectIdStr ? BigInt(projectIdStr) : undefined;

    const workflows = await getBugWorkflows(projectId);
    return NextResponse.json(serializeBigInt({ workflows }));
  } catch (error) {
    console.error('Error fetching workflows:', error);
    return NextResponse.json({ error: 'ワークフローの取得に失敗しました。' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateCreateBugWorkflow(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const workflow = await createBugWorkflow(validation.data);
    return NextResponse.json(serializeBigInt(workflow), { status: 201 });
  } catch (error) {
    console.error('Error creating workflow:', error);
    return NextResponse.json({ error: 'ワークフローの作成に失敗しました。' }, { status: 500 });
  }
}
