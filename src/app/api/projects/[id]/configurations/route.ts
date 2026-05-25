/**
 * コンフィギュレーション API
 * GET  /api/projects/[id]/configurations - コンフィギュレーション一覧取得
 * POST /api/projects/[id]/configurations - コンフィギュレーション作成
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  projectExists,
  isConfigurationNameTaken,
  getConfigurations,
  createConfiguration,
} from '@/lib/repositories/configuration-repository';
import { validateCreateConfigurationInput } from '@/types/configuration';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/projects/[id]/configurations - コンフィギュレーション一覧取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'プロジェクトIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // クエリパラメータを解析
    const { searchParams } = new URL(request.url);
    const isActive = searchParams.get('isActive');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy');
    const sortOrder = searchParams.get('sortOrder');

    const configurations = await getConfigurations(projectId, {
      isActive: isActive === null ? undefined : isActive === 'true',
      search: search || undefined,
      sortBy: (sortBy as 'name' | 'sortOrder' | 'createdAt' | 'updatedAt') || undefined,
      sortOrder: (sortOrder as 'asc' | 'desc') || undefined,
    });

    return NextResponse.json(configurations);
  } catch (error) {
    console.error('Get configurations error:', error);
    return NextResponse.json(
      { error: 'コンフィギュレーションの取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// POST /api/projects/[id]/configurations - コンフィギュレーション作成
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    if (!projectId) {
      return NextResponse.json({ error: 'プロジェクトIDは必須です。' }, { status: 400 });
    }

    // プロジェクトの存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateCreateConfigurationInput({ ...body, projectId });
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // 名前重複チェック
    const nameTaken = await isConfigurationNameTaken(BigInt(projectId), validation.data!.name);
    if (nameTaken) {
      return NextResponse.json(
        { error: '同じ名前のコンフィギュレーションが既に存在します。' },
        { status: 409 }
      );
    }

    // コンフィギュレーション作成
    const configuration = await createConfiguration(validation.data!);

    return NextResponse.json(configuration, { status: 201 });
  } catch (error) {
    console.error('Create configuration error:', error);
    return NextResponse.json(
      { error: 'コンフィギュレーションの作成に失敗しました。' },
      { status: 500 }
    );
  }
}
