import { NextRequest, NextResponse } from 'next/server';
import {
  getBugTypeMasterById,
  updateBugTypeMaster,
  deleteBugTypeMaster,
} from '@/repositories/bug-settings-repository';
import { validateUpdateBugTypeMaster } from '@/types/bug-settings';
import { serializeBigInt } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const type = await getBugTypeMasterById(BigInt(id));

    if (!type) {
      return NextResponse.json({ error: 'バグ種別が見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(serializeBigInt(type));
  } catch (error) {
    console.error('Error fetching bug type:', error);
    return NextResponse.json({ error: 'バグ種別の取得に失敗しました。' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateUpdateBugTypeMaster(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const existing = await getBugTypeMasterById(BigInt(id));
    if (!existing) {
      return NextResponse.json({ error: 'バグ種別が見つかりません。' }, { status: 404 });
    }

    const type = await updateBugTypeMaster(BigInt(id), validation.data);
    return NextResponse.json(serializeBigInt(type));
  } catch (error) {
    console.error('Error updating bug type:', error);
    return NextResponse.json({ error: 'バグ種別の更新に失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await getBugTypeMasterById(BigInt(id));
    if (!existing) {
      return NextResponse.json({ error: 'バグ種別が見つかりません。' }, { status: 404 });
    }

    // System-wide defaults cannot be deleted
    if (existing.projectId === null) {
      return NextResponse.json(
        { error: 'システムデフォルトの種別は削除できません。' },
        { status: 400 }
      );
    }

    await deleteBugTypeMaster(BigInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bug type:', error);
    return NextResponse.json({ error: 'バグ種別の削除に失敗しました。' }, { status: 500 });
  }
}
