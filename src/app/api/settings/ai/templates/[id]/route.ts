import { NextRequest, NextResponse } from 'next/server';
import { promptTemplateRepository } from '@/repositories/prompt-template-repository';
import { validateTemplateName, validateTemplateContent } from '@/types/prompt-template';

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/settings/ai/templates/[id]
 * テンプレートを取得
 */
export async function GET(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const templateId = BigInt(id);

    const template = await promptTemplateRepository.findById(templateId);

    if (!template) {
      return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 });
    }

    return NextResponse.json({
      template: {
        ...template,
        id: template.id.toString(),
        projectId: template.projectId?.toString() ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to get template:', error);
    return NextResponse.json({ error: 'テンプレートの取得に失敗しました' }, { status: 500 });
  }
}

/**
 * PATCH /api/settings/ai/templates/[id]
 * テンプレートを更新
 */
export async function PATCH(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const templateId = BigInt(id);

    const body = await request.json();
    const { name, description, content, variables, isDefault } = body;

    // Validation
    if (name !== undefined) {
      const nameError = validateTemplateName(name);
      if (nameError) {
        return NextResponse.json({ error: nameError }, { status: 400 });
      }
    }

    if (content !== undefined) {
      const contentError = validateTemplateContent(content);
      if (contentError) {
        return NextResponse.json({ error: contentError }, { status: 400 });
      }
    }

    const template = await promptTemplateRepository.update(templateId, {
      name,
      description,
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
    console.error('Failed to update template:', error);
    if (error instanceof Error) {
      if (error.message.includes('System templates')) {
        return NextResponse.json(
          { error: 'システムテンプレートは変更できません' },
          { status: 400 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'テンプレートの更新に失敗しました' }, { status: 500 });
  }
}

/**
 * DELETE /api/settings/ai/templates/[id]
 * テンプレートを削除
 */
export async function DELETE(request: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    const templateId = BigInt(id);

    await promptTemplateRepository.delete(templateId);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete template:', error);
    if (error instanceof Error) {
      if (error.message.includes('System templates')) {
        return NextResponse.json(
          { error: 'システムテンプレートは削除できません' },
          { status: 400 }
        );
      }
      if (error.message.includes('not found')) {
        return NextResponse.json({ error: 'テンプレートが見つかりません' }, { status: 404 });
      }
    }
    return NextResponse.json({ error: 'テンプレートの削除に失敗しました' }, { status: 500 });
  }
}
