import { NextRequest, NextResponse } from 'next/server';
import {
  getBugSeverityMasters,
  createBugSeverityMaster,
} from '@/repositories/bug-settings-repository';
import { validateCreateBugSeverityMaster } from '@/types/bug-settings';
import { serializeBigInt } from '@/lib/utils';

export async function GET(request: NextRequest) {
  try {
    const searchParams = request.nextUrl.searchParams;
    const projectIdStr = searchParams.get('projectId');
    const projectId = projectIdStr ? BigInt(projectIdStr) : undefined;

    const severities = await getBugSeverityMasters(projectId);
    return NextResponse.json(serializeBigInt({ severities }));
  } catch (error) {
    console.error('Error fetching bug severities:', error);
    return NextResponse.json({ error: 'バグ重要度の取得に失敗しました。' }, { status: 500 });
  }
}

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const validation = validateCreateBugSeverityMaster(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const severity = await createBugSeverityMaster(validation.data);
    return NextResponse.json(serializeBigInt(severity), { status: 201 });
  } catch (error) {
    console.error('Error creating bug severity:', error);
    return NextResponse.json({ error: 'バグ重要度の作成に失敗しました。' }, { status: 500 });
  }
}
