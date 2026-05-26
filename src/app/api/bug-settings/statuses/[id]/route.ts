import { NextRequest, NextResponse } from 'next/server';
import {
  getBugStatusMasterById,
  updateBugStatusMaster,
  deleteBugStatusMaster,
} from '@/repositories/bug-settings-repository';
import { validateUpdateBugStatusMaster } from '@/types/bug-settings';
import { serializeBigInt } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const status = await getBugStatusMasterById(BigInt(id));

    if (!status) {
      return NextResponse.json({ error: 'バグステータスが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(serializeBigInt(status));
  } catch (error) {
    console.error('Error fetching bug status:', error);
    return NextResponse.json({ error: 'バグステータスの取得に失敗しました。' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateUpdateBugStatusMaster(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const existing = await getBugStatusMasterById(BigInt(id));
    if (!existing) {
      return NextResponse.json({ error: 'バグステータスが見つかりません。' }, { status: 404 });
    }

    const status = await updateBugStatusMaster(BigInt(id), validation.data);
    return NextResponse.json(serializeBigInt(status));
  } catch (error) {
    console.error('Error updating bug status:', error);
    return NextResponse.json({ error: 'バグステータスの更新に失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await getBugStatusMasterById(BigInt(id));
    if (!existing) {
      return NextResponse.json({ error: 'バグステータスが見つかりません。' }, { status: 404 });
    }

    if (existing.projectId === null) {
      return NextResponse.json(
        { error: 'システムデフォルトのステータスは削除できません。' },
        { status: 400 }
      );
    }

    await deleteBugStatusMaster(BigInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bug status:', error);
    return NextResponse.json({ error: 'バグステータスの削除に失敗しました。' }, { status: 500 });
  }
}
