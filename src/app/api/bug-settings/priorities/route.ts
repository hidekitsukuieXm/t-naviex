import { NextRequest, NextResponse } from 'next/server';
import {
  getBugPriorityMasters,
  createBugPriorityMaster,
} from '@/repositories/bug-settings-repository';
import { validateCreateBugPriorityMaster } from '@/types/bug-settings';
import { serializeBigInt } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectIdStr = searchParams.get('projectId');
    const projectId = projectIdStr ? BigInt(projectIdStr) : undefined;

    const priorities = await getBugPriorityMasters(projectId);
    return NextResponse.json(serializeBigInt({ priorities }));
  } catch (error) {
    console.error('Error fetching bug priorities:', error);
    return NextResponse.json({ error: 'バグ優先度の取得に失敗しました。' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateCreateBugPriorityMaster(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const priority = await createBugPriorityMaster(validation.data);
    return NextResponse.json(serializeBigInt(priority), { status: 201 });
  } catch (error) {
    console.error('Error creating bug priority:', error);
    return NextResponse.json({ error: 'バグ優先度の作成に失敗しました。' }, { status: 500 });
  }
}
