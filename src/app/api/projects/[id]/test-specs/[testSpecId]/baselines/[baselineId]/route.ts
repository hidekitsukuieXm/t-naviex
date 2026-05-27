/**
 * ベースライン詳細・更新・削除API
 * GET /api/projects/[id]/test-specs/[testSpecId]/baselines/[baselineId] - ベースライン詳細を取得
 * PUT /api/projects/[id]/test-specs/[testSpecId]/baselines/[baselineId] - ベースラインを更新
 * DELETE /api/projects/[id]/test-specs/[testSpecId]/baselines/[baselineId] - ベースラインを削除
 */

import { NextRequest, NextResponse } from 'next/server';
import {
  getBaselineById,
  updateBaseline,
  deleteBaseline,
} from '@/repositories/baseline-repository';
import { validateUpdateBaselineInput } from '@/types/baseline';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; testSpecId: string; baselineId: string }>;
}

/**
 * ベースライン詳細を取得
 */
export async function GET(_request: NextRequest, { params }: RouteParams) {
  try {
    const { testSpecId, baselineId } = await params;

    const baseline = await getBaselineById(testSpecId, baselineId);

    if (!baseline) {
      return NextResponse.json({ error: 'ベースラインが見つかりません' }, { status: 404 });
    }

    return NextResponse.json(baseline);
  } catch (error) {
    console.error('Failed to fetch baseline:', error);
    return NextResponse.json({ error: 'ベースラインの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * ベースラインを更新
 */
export async function PUT(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { testSpecId, baselineId } = await params;
    const body = await request.json();

    // バリデーション
    const validation = validateUpdateBaselineInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const baseline = await updateBaseline(testSpecId, baselineId, body);

    return NextResponse.json(baseline);
  } catch (error) {
    console.error('Failed to update baseline:', error);
    if (error instanceof Error) {
      if (error.message.includes('見つかりません')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('更新できません')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json({ error: 'ベースラインの更新に失敗しました' }, { status: 500 });
  }
}

/**
 * ベースラインを削除
 */
export async function DELETE(_request: NextRequest, { params }: RouteParams) {
  try {
    const session = await getServerSession(authOptions);
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { testSpecId, baselineId } = await params;

    await deleteBaseline(testSpecId, baselineId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete baseline:', error);
    if (error instanceof Error) {
      if (error.message.includes('見つかりません')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
      if (error.message.includes('削除できません')) {
        return NextResponse.json({ error: error.message }, { status: 400 });
      }
    }
    return NextResponse.json({ error: 'ベースラインの削除に失敗しました' }, { status: 500 });
  }
}
