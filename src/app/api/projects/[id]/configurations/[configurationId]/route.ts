/**
 * コンフィギュレーション個別 API
 * GET    /api/projects/[id]/configurations/[configurationId] - コンフィギュレーション取得
 * PUT    /api/projects/[id]/configurations/[configurationId] - コンフィギュレーション更新
 * DELETE /api/projects/[id]/configurations/[configurationId] - コンフィギュレーション削除
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  projectExists,
  configurationExistsInProject,
  isConfigurationNameTaken,
  getConfigurationById,
  updateConfiguration,
  deleteConfiguration,
} from '@/lib/repositories/configuration-repository';
import { validateUpdateConfigurationInput } from '@/types/configuration';

interface RouteParams {
  params: Promise<{ id: string; configurationId: string }>;
}

// GET /api/projects/[id]/configurations/[configurationId] - コンフィギュレーション取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, configurationId } = await params;

    if (!projectId || !configurationId) {
      return NextResponse.json(
        { error: 'プロジェクトIDとコンフィギュレーションIDは必須です。' },
        { status: 400 }
      );
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // コンフィギュレーション取得
    const configuration = await getConfigurationById(BigInt(configurationId));

    if (!configuration) {
      return NextResponse.json(
        { error: 'コンフィギュレーションが見つかりません。' },
        { status: 404 }
      );
    }

    // プロジェクトに属しているか確認
    if (configuration.projectId !== projectId) {
      return NextResponse.json(
        { error: 'コンフィギュレーションが見つかりません。' },
        { status: 404 }
      );
    }

    return NextResponse.json(configuration);
  } catch (error) {
    console.error('Get configuration error:', error);
    return NextResponse.json(
      { error: 'コンフィギュレーションの取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// PUT /api/projects/[id]/configurations/[configurationId] - コンフィギュレーション更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, configurationId } = await params;

    if (!projectId || !configurationId) {
      return NextResponse.json(
        { error: 'プロジェクトIDとコンフィギュレーションIDは必須です。' },
        { status: 400 }
      );
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // コンフィギュレーションの存在確認
    const configurationExistsResult = await configurationExistsInProject(
      BigInt(projectId),
      BigInt(configurationId)
    );
    if (!configurationExistsResult) {
      return NextResponse.json(
        { error: 'コンフィギュレーションが見つかりません。' },
        { status: 404 }
      );
    }

    const body = await request.json();

    // バリデーション
    const validation = validateUpdateConfigurationInput(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: 'バリデーションエラー', details: validation.errors },
        { status: 400 }
      );
    }

    // 名前変更時の重複チェック
    if (validation.data!.name) {
      const nameTaken = await isConfigurationNameTaken(
        BigInt(projectId),
        validation.data!.name,
        BigInt(configurationId)
      );
      if (nameTaken) {
        return NextResponse.json(
          { error: '同じ名前のコンフィギュレーションが既に存在します。' },
          { status: 409 }
        );
      }
    }

    // コンフィギュレーション更新
    const configuration = await updateConfiguration(BigInt(configurationId), validation.data!);

    if (!configuration) {
      return NextResponse.json(
        { error: 'コンフィギュレーションが見つかりません。' },
        { status: 404 }
      );
    }

    return NextResponse.json(configuration);
  } catch (error) {
    console.error('Update configuration error:', error);
    return NextResponse.json(
      { error: 'コンフィギュレーションの更新に失敗しました。' },
      { status: 500 }
    );
  }
}

// DELETE /api/projects/[id]/configurations/[configurationId] - コンフィギュレーション削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, configurationId } = await params;

    if (!projectId || !configurationId) {
      return NextResponse.json(
        { error: 'プロジェクトIDとコンフィギュレーションIDは必須です。' },
        { status: 400 }
      );
    }

    // プロジェクトの存在確認
    const projectExistsResult = await projectExists(BigInt(projectId));
    if (!projectExistsResult) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // コンフィギュレーションの存在確認
    const configurationExistsResult = await configurationExistsInProject(
      BigInt(projectId),
      BigInt(configurationId)
    );
    if (!configurationExistsResult) {
      return NextResponse.json(
        { error: 'コンフィギュレーションが見つかりません。' },
        { status: 404 }
      );
    }

    // コンフィギュレーション削除
    const result = await deleteConfiguration(BigInt(configurationId));

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete configuration error:', error);
    return NextResponse.json(
      { error: 'コンフィギュレーションの削除に失敗しました。' },
      { status: 500 }
    );
  }
}
