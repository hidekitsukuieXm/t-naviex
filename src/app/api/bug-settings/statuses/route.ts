import { NextRequest, NextResponse } from 'next/server';
import { getBugStatusMasters, createBugStatusMaster } from '@/repositories/bug-settings-repository';
import { validateCreateBugStatusMaster } from '@/types/bug-settings';
import { serializeBigInt } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectIdStr = searchParams.get('projectId');
    const projectId = projectIdStr ? BigInt(projectIdStr) : undefined;

    const statuses = await getBugStatusMasters(projectId);
    return NextResponse.json(serializeBigInt({ statuses }));
  } catch (error) {
    console.error('Error fetching bug statuses:', error);
    return NextResponse.json({ error: 'バグステータスの取得に失敗しました。' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateCreateBugStatusMaster(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const status = await createBugStatusMaster(validation.data);
    return NextResponse.json(serializeBigInt(status), { status: 201 });
  } catch (error) {
    console.error('Error creating bug status:', error);
    return NextResponse.json({ error: 'バグステータスの作成に失敗しました。' }, { status: 500 });
  }
}
