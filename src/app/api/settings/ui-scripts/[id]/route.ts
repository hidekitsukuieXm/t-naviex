import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateUiScript, type UpdateUiScriptData } from '@/types/ui-script';
import { logAudit } from '@/lib/audit';

type Params = { params: Promise<{ id: string }> };

// GET /api/settings/ui-scripts/[id] - UIスクリプト詳細取得
export async function GET(_request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const scriptId = BigInt(id);

    const script = await prisma.uiScript.findUnique({
      where: { id: scriptId },
    });

    if (!script) {
      return NextResponse.json({ error: 'UIスクリプトが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json({
      id: script.id.toString(),
      name: script.name,
      description: script.description,
      trigger: script.trigger,
      targetPage: script.targetPage,
      script: script.script,
      css: script.css,
      isActive: script.isActive,
      priority: script.priority,
      metadata: script.metadata,
      createdAt: script.createdAt.toISOString(),
      updatedAt: script.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Get UI script error:', error);
    return NextResponse.json({ error: 'UIスクリプトの取得に失敗しました。' }, { status: 500 });
  }
}

// PUT /api/settings/ui-scripts/[id] - UIスクリプト更新
export async function PUT(request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const scriptId = BigInt(id);

    const body: UpdateUiScriptData = await request.json();

    // バリデーション
    const validation = validateUiScript(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    const existing = await prisma.uiScript.findUnique({
      where: { id: scriptId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'UIスクリプトが見つかりません。' }, { status: 404 });
    }

    const script = await prisma.uiScript.update({
      where: { id: scriptId },
      data: {
        ...(body.name !== undefined && { name: body.name }),
        ...(body.description !== undefined && { description: body.description }),
        ...(body.trigger !== undefined && { trigger: body.trigger }),
        ...(body.targetPage !== undefined && { targetPage: body.targetPage }),
        ...(body.script !== undefined && { script: body.script }),
        ...(body.css !== undefined && { css: body.css }),
        ...(body.isActive !== undefined && { isActive: body.isActive }),
        ...(body.priority !== undefined && { priority: body.priority }),
        ...(body.metadata !== undefined && { metadata: body.metadata }),
      },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: 'UI_SCRIPT_UPDATE',
      targetType: 'UI_SCRIPT',
      targetId: script.id.toString(),
      details: { name: script.name },
    });

    return NextResponse.json({
      id: script.id.toString(),
      name: script.name,
      description: script.description,
      trigger: script.trigger,
      targetPage: script.targetPage,
      script: script.script,
      css: script.css,
      isActive: script.isActive,
      priority: script.priority,
      metadata: script.metadata,
      createdAt: script.createdAt.toISOString(),
      updatedAt: script.updatedAt.toISOString(),
    });
  } catch (error) {
    console.error('Update UI script error:', error);
    return NextResponse.json({ error: 'UIスクリプトの更新に失敗しました。' }, { status: 500 });
  }
}

// DELETE /api/settings/ui-scripts/[id] - UIスクリプト削除
export async function DELETE(_request: Request, { params }: Params) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const scriptId = BigInt(id);

    const existing = await prisma.uiScript.findUnique({
      where: { id: scriptId },
    });

    if (!existing) {
      return NextResponse.json({ error: 'UIスクリプトが見つかりません。' }, { status: 404 });
    }

    await prisma.uiScript.delete({
      where: { id: scriptId },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: 'UI_SCRIPT_DELETE',
      targetType: 'UI_SCRIPT',
      targetId: id,
      details: { name: existing.name },
    });

    return NextResponse.json({ message: 'UIスクリプトを削除しました。' });
  } catch (error) {
    console.error('Delete UI script error:', error);
    return NextResponse.json({ error: 'UIスクリプトの削除に失敗しました。' }, { status: 500 });
  }
}
