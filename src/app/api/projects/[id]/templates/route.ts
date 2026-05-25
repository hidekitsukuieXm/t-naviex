/**
 * テンプレート一覧・作成 API
 * GET /api/projects/[id]/templates - テンプレート一覧取得
 * POST /api/projects/[id]/templates - テンプレート作成
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTemplates,
  createTemplate,
  getTemplateByName,
} from '@/lib/repositories/template-repository';
import { projectExists } from '@/lib/repositories/project-repository';
import { validateCreateTemplateInput } from '@/types/template';

type RouteParams = {
  params: Promise<{ id: string }>;
};

/**
 * GET /api/projects/[id]/templates
 * テンプレート一覧を取得
 */
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(projectId);
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // クエリパラメータ
    const { searchParams } = new URL(request.url);
    const defaultOnly = searchParams.get('defaultOnly') === 'true';

    const result = await getTemplates(projectId, { defaultOnly });

    return NextResponse.json(result);
  } catch (error) {
    console.error('テンプレート一覧取得エラー:', error);
    return NextResponse.json({ error: 'テンプレートの取得に失敗しました。' }, { status: 500 });
  }
}

/**
 * POST /api/projects/[id]/templates
 * テンプレートを作成
 */
export async function POST(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(projectId);
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // 入力バリデーション
    const validation = validateCreateTemplateInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // 名前重複チェック
    const existingTemplate = await getTemplateByName(projectId, body.name);
    if (existingTemplate) {
      return NextResponse.json(
        { error: '同じ名前のテンプレートが既に存在します。' },
        { status: 409 }
      );
    }

    const template = await createTemplate(projectId, body);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('テンプレート作成エラー:', error);
    return NextResponse.json({ error: 'テンプレートの作成に失敗しました。' }, { status: 500 });
  }
}
