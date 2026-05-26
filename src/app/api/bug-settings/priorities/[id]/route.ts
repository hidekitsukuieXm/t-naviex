import { NextRequest, NextResponse } from 'next/server';
import {
  getBugPriorityMasterById,
  updateBugPriorityMaster,
  deleteBugPriorityMaster,
} from '@/repositories/bug-settings-repository';
import { validateUpdateBugPriorityMaster } from '@/types/bug-settings';
import { serializeBigInt } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const priority = await getBugPriorityMasterById(BigInt(id));

    if (!priority) {
      return NextResponse.json({ error: 'バグ優先度が見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(serializeBigInt(priority));
  } catch (error) {
    console.error('Error fetching bug priority:', error);
    return NextResponse.json({ error: 'バグ優先度の取得に失敗しました。' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateUpdateBugPriorityMaster(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const existing = await getBugPriorityMasterById(BigInt(id));
    if (!existing) {
      return NextResponse.json({ error: 'バグ優先度が見つかりません。' }, { status: 404 });
    }

    const priority = await updateBugPriorityMaster(BigInt(id), validation.data);
    return NextResponse.json(serializeBigInt(priority));
  } catch (error) {
    console.error('Error updating bug priority:', error);
    return NextResponse.json({ error: 'バグ優先度の更新に失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await getBugPriorityMasterById(BigInt(id));
    if (!existing) {
      return NextResponse.json({ error: 'バグ優先度が見つかりません。' }, { status: 404 });
    }

    if (existing.projectId === null) {
      return NextResponse.json(
        { error: 'システムデフォルトの優先度は削除できません。' },
        { status: 400 }
      );
    }

    await deleteBugPriorityMaster(BigInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bug priority:', error);
    return NextResponse.json({ error: 'バグ優先度の削除に失敗しました。' }, { status: 500 });
  }
}
