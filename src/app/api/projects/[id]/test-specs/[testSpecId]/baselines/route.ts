/**
 * ベースライン一覧・作成API
 * GET /api/projects/[id]/test-specs/[testSpecId]/baselines - ベースライン一覧を取得
 * POST /api/projects/[id]/test-specs/[testSpecId]/baselines - ベースラインを作成
 */

import { NextRequest, NextResponse } from 'next/server';
import { getBaselines, createBaseline } from '@/repositories/baseline-repository';
import { validateCreateBaselineInput, type BaselineStatus } from '@/types/baseline';
import { auth } from '@/lib/auth';

interface RouteParams {
  params: Promise<{ id: string; testSpecId: string }>;
}

/**
 * ベースライン一覧を取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { testSpecId } = await params;
    const { searchParams } = new URL(request.url);

    const search = searchParams.get('search') || undefined;
    const status = searchParams.get('status') as BaselineStatus | undefined;
    const sortBy =
      (searchParams.get('sortBy') as 'name' | 'createdAt' | 'version' | 'snapshotAt') ||
      'snapshotAt';
    const sortOrder = (searchParams.get('sortOrder') as 'asc' | 'desc') || 'desc';
    const skip = parseInt(searchParams.get('skip') || '0', 10);
    const take = parseInt(searchParams.get('take') || '50', 10);

    const result = await getBaselines(testSpecId, {
      search,
      status,
      sortBy,
      sortOrder,
      skip,
      take,
    });

    return NextResponse.json(result);
  } catch (error) {
    console.error('Failed to fetch baselines:', error);
    return NextResponse.json({ error: 'ベースラインの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * ベースラインを作成
 */
export async function POST(request: NextRequest, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です' }, { status: 401 });
    }

    const { testSpecId } = await params;
    const body = await request.json();

    // バリデーション
    const validation = validateCreateBaselineInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(', ') }, { status: 400 });
    }

    const baseline = await createBaseline(testSpecId, session.user.id, body);

    return NextResponse.json(baseline, { status: 201 });
  } catch (error) {
    console.error('Failed to create baseline:', error);
    if (error instanceof Error) {
      if (error.message.includes('既に存在')) {
        return NextResponse.json({ error: error.message }, { status: 409 });
      }
      if (error.message.includes('見つかりません')) {
        return NextResponse.json({ error: error.message }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'ベースラインの作成に失敗しました' }, { status: 500 });
  }
}
