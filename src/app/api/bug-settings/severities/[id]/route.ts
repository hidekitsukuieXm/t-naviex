import { NextRequest, NextResponse } from 'next/server';
import {
  getBugSeverityMasterById,
  updateBugSeverityMaster,
  deleteBugSeverityMaster,
} from '@/repositories/bug-settings-repository';
import { validateUpdateBugSeverityMaster } from '@/types/bug-settings';
import { serializeBigInt } from '@/lib/utils';

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const severity = await getBugSeverityMasterById(BigInt(id));

    if (!severity) {
      return NextResponse.json({ error: 'バグ重要度が見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(serializeBigInt(severity));
  } catch (error) {
    console.error('Error fetching bug severity:', error);
    return NextResponse.json({ error: 'バグ重要度の取得に失敗しました。' }, { status: 500 });
  }
}

export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const body = await request.json();
    const validation = validateUpdateBugSeverityMaster(body);

    if (!validation.valid || !validation.data) {
      return NextResponse.json(
        { error: validation.error || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const existing = await getBugSeverityMasterById(BigInt(id));
    if (!existing) {
      return NextResponse.json({ error: 'バグ重要度が見つかりません。' }, { status: 404 });
    }

    const severity = await updateBugSeverityMaster(BigInt(id), validation.data);
    return NextResponse.json(serializeBigInt(severity));
  } catch (error) {
    console.error('Error updating bug severity:', error);
    return NextResponse.json({ error: 'バグ重要度の更新に失敗しました。' }, { status: 500 });
  }
}

export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;

    const existing = await getBugSeverityMasterById(BigInt(id));
    if (!existing) {
      return NextResponse.json({ error: 'バグ重要度が見つかりません。' }, { status: 404 });
    }

    if (existing.projectId === null) {
      return NextResponse.json(
        { error: 'システムデフォルトの重要度は削除できません。' },
        { status: 400 }
      );
    }

    await deleteBugSeverityMaster(BigInt(id));
    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Error deleting bug severity:', error);
    return NextResponse.json({ error: 'バグ重要度の削除に失敗しました。' }, { status: 500 });
  }
}
