/**
 * テンプレート複製 API
 * POST /api/projects/[id]/templates/[templateId]/duplicate - テンプレート複製
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getTemplateDetail,
  duplicateTemplate,
  getTemplateByName,
} from '@/lib/repositories/template-repository';
import { projectExists } from '@/lib/repositories/project-repository';
import { validateTemplateName } from '@/types/template';

type RouteParams = {
  params: Promise<{ id: string; templateId: string }>;
};

/**
 * POST /api/projects/[id]/templates/[templateId]/duplicate
 * テンプレートを複製
 */
export async function POST(request: Request, { params }: RouteParams) {
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
    const newName = body.name as string;

    // 名前バリデーション
    const nameValidation = validateTemplateName(newName);
    if (!nameValidation.valid) {
      return NextResponse.json({ error: nameValidation.error }, { status: 400 });
    }

    // 名前重複チェック
    const duplicate = await getTemplateByName(projectId, newName);
    if (duplicate) {
      return NextResponse.json(
        { error: '同じ名前のテンプレートが既に存在します。' },
        { status: 409 }
      );
    }

    const template = await duplicateTemplate(projectId, templateId, newName);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('テンプレート複製エラー:', error);
    return NextResponse.json({ error: 'テンプレートの複製に失敗しました。' }, { status: 500 });
  }
}
