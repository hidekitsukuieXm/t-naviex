import { NextRequest, NextResponse } from 'next/server';
import { getBugTypeMasters, createBugTypeMaster } from '@/repositories/bug-settings-repository';
import { validateCreateBugTypeMaster } from '@/types/bug-settings';
import { serializeBigInt } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectIdStr = searchParams.get('projectId');
    const projectId = projectIdStr ? BigInt(projectIdStr) : undefined;

    const types = await getBugTypeMasters(projectId);
    return NextResponse.json(serializeBigInt({ types }));
  } catch (error) {
    console.error('Error fetching bug types:', error);
    return NextResponse.json({ error: 'バグ種別の取得に失敗しました。' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateCreateBugTypeMaster(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const type = await createBugTypeMaster(validation.data);
    return NextResponse.json(serializeBigInt(type), { status: 201 });
  } catch (error) {
    console.error('Error creating bug type:', error);
    return NextResponse.json({ error: 'バグ種別の作成に失敗しました。' }, { status: 500 });
  }
}
