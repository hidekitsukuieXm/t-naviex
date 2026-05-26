import { NextRequest, NextResponse } from 'next/server';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import {
  validateTemplateName,
  validateTemplateContent,
  PromptTemplateType,
} from '@/types/prompt-template';

/**
 * GET /api/settings/ai/templates
 * テンプレート一覧を取得
 */
export async function GET(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const typeParam = request.nextUrl.searchParams.get('type');
    const initParam = request.nextUrl.searchParams.get('initialize');

    const projectId = projectIdParam ? BigInt(projectIdParam) : null;
    const type = typeParam as PromptTemplateType | undefined;

    // Initialize system templates if requested
    if (initParam === 'true') {
      await promptTemplateRepository.initializeSystemTemplates();
    }

    const templates = await promptTemplateRepository.findByProject(projectId, type);

    return NextResponse.json({
      templates: templates.map((t) => ({
        ...t,
        id: t.id.toString(),
        projectId: t.projectId?.toString() ?? null,
      })),
    });
  } catch (error) {
    console.error('Failed to get templates:', error);
    return NextResponse.json({ error: 'テンプレートの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * POST /api/settings/ai/templates
 * テンプレートを作成
 */
export async function POST(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const body = await request.json();
    const { name, description, type, content, variables, isDefault } = body;

    // Validation
    const nameError = validateTemplateName(name);
    if (nameError) {
      return NextResponse.json({ error: nameError }, { status: 400 });
    }

    const contentError = validateTemplateContent(content);
    if (contentError) {
      return NextResponse.json({ error: contentError }, { status: 400 });
    }

    if (!type) {
      return NextResponse.json({ error: 'テンプレートタイプは必須です' }, { status: 400 });
    }

    const template = await promptTemplateRepository.create(projectId, {
      name,
      description,
      type,
      content,
      variables,
      isDefault,
    });

    return NextResponse.json({
      template: {
        ...template,
        id: template.id.toString(),
        projectId: template.projectId?.toString() ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to create template:', error);
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: '同じ名前のテンプレートが既に存在します' },
        { status: 400 }
      );
    }
    return NextResponse.json({ error: 'テンプレートの作成に失敗しました' }, { status: 500 });
  }
}
