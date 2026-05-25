/**
 * テンプレート詳細・更新・削除 API
 * GET /api/projects/[id]/templates/[templateId] - テンプレート詳細取得
 * PUT /api/projects/[id]/templates/[templateId] - テンプレート更新
 * DELETE /api/projects/[id]/templates/[templateId] - テンプレート削除
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTemplateDetail,
  updateTemplate,
  deleteTemplate,
  getTemplateByName,
} from '@/lib/repositories/template-repository';
import { projectExists } from '@/lib/repositories/project-repository';
import { validateUpdateTemplateInput } from '@/types/template';

type RouteParams = {
  params: Promise<{ id: string; templateId: string }>;
};

/**
 * GET /api/projects/[id]/templates/[templateId]
 * テンプレート詳細を取得
 */
export async function GET(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, templateId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(projectId);
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    const template = await getTemplateDetail(projectId, templateId);
    if (!template) {
      return NextResponse.json({ error: 'テンプレートが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('テンプレート詳細取得エラー:', error);
    return NextResponse.json({ error: 'テンプレートの取得に失敗しました。' }, { status: 500 });
  }
}

/**
 * PUT /api/projects/[id]/templates/[templateId]
 * テンプレートを更新
 */
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, templateId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(projectId);
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // テンプレート存在確認
    const existingTemplate = await getTemplateDetail(projectId, templateId);
    if (!existingTemplate) {
      return NextResponse.json({ error: 'テンプレートが見つかりません。' }, { status: 404 });
    }

    const body = await request.json();

    // 入力バリデーション
    const validation = validateUpdateTemplateInput(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    // 名前変更時の重複チェック
    if (body.name && body.name !== existingTemplate.name) {
      const duplicate = await getTemplateByName(projectId, body.name);
      if (duplicate) {
        return NextResponse.json(
          { error: '同じ名前のテンプレートが既に存在します。' },
          { status: 409 }
        );
      }
    }

    const template = await updateTemplate(projectId, templateId, body);

    return NextResponse.json(template);
  } catch (error) {
    console.error('テンプレート更新エラー:', error);
    return NextResponse.json({ error: 'テンプレートの更新に失敗しました。' }, { status: 500 });
  }
}

/**
 * DELETE /api/projects/[id]/templates/[templateId]
 * テンプレートを削除
 */
export async function DELETE(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, templateId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(projectId);
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // テンプレート存在確認
    const existingTemplate = await getTemplateDetail(projectId, templateId);
    if (!existingTemplate) {
      return NextResponse.json({ error: 'テンプレートが見つかりません。' }, { status: 404 });
    }

    await deleteTemplate(projectId, templateId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('テンプレート削除エラー:', error);
    return NextResponse.json({ error: 'テンプレートの削除に失敗しました。' }, { status: 500 });
  }
}
