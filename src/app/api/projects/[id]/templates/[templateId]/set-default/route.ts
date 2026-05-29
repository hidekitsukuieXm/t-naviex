/**
 * テンプレートデフォルト設定 API
 * POST /api/projects/[id]/templates/[templateId]/set-default - デフォルトに設定
 */

import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { getTemplateDetail, setDefaultTemplate } from '@/lib/repositories/template-repository';
import { projectExists } from '@/lib/repositories/project-repository';

type RouteParams = {
  params: Promise<{ id: string; templateId: string }>;
};

/**
 * POST /api/projects/[id]/templates/[templateId]/set-default
 * テンプレートをデフォルトに設定
 */
export async function POST(_request: Request, { params }: RouteParams) {
  try {
    const session = await auth();
    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id: projectId, templateId } = await params;

    // プロジェクト存在確認
    const exists = await projectExists(BigInt(projectId));
    if (!exists) {
      return NextResponse.json({ error: 'プロジェクトが見つかりません。' }, { status: 404 });
    }

    // テンプレート存在確認
    const existingTemplate = await getTemplateDetail(projectId, templateId);
    if (!existingTemplate) {
      return NextResponse.json({ error: 'テンプレートが見つかりません。' }, { status: 404 });
    }

    await setDefaultTemplate(projectId, templateId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('テンプレートデフォルト設定エラー:', error);
    return NextResponse.json({ error: 'デフォルト設定に失敗しました。' }, { status: 500 });
  }
}
