import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { prisma } from '@/lib/prisma';
import { validateUiScript, type UiScript, type CreateUiScriptData } from '@/types/ui-script';
import { logAudit } from '@/lib/audit';

// GET /api/settings/ui-scripts - UIスクリプト一覧取得
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);
    const activeOnly = searchParams.get('activeOnly') === 'true';

    const where = activeOnly ? { isActive: true } : {};

    const scripts = await prisma.uiScript.findMany({
      where,
      orderBy: [{ priority: 'asc' }, { createdAt: 'desc' }],
    });

    const serialized: UiScript[] = scripts.map((script) => ({
      id: script.id.toString(),
      name: script.name,
      description: script.description,
      trigger: script.trigger,
      targetPage: script.targetPage,
      script: script.script,
      css: script.css,
      isActive: script.isActive,
      priority: script.priority,
      metadata: script.metadata as Record<string, unknown> | null,
      createdAt: script.createdAt.toISOString(),
      updatedAt: script.updatedAt.toISOString(),
    }));

    return NextResponse.json({
      scripts: serialized,
      total: serialized.length,
    });
  } catch (error) {
    console.error('Get UI scripts error:', error);
    return NextResponse.json({ error: 'UIスクリプト一覧の取得に失敗しました。' }, { status: 500 });
  }
}

// POST /api/settings/ui-scripts - UIスクリプト作成
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body: CreateUiScriptData = await request.json();

    // バリデーション
    const validation = validateUiScript(body);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.errors.join(' ') }, { status: 400 });
    }

    const script = await prisma.uiScript.create({
      data: {
        name: body.name,
        description: body.description ?? null,
        trigger: body.trigger ?? 'PAGE_LOAD',
        targetPage: body.targetPage ?? null,
        script: body.script ?? null,
        css: body.css ?? null,
        isActive: body.isActive ?? true,
        priority: body.priority ?? 0,
        metadata: body.metadata ?? null,
      },
    });

    // 監査ログを記録
    await logAudit({
      userId: session.user.id,
      action: 'UI_SCRIPT_CREATE',
      targetType: 'UI_SCRIPT',
      targetId: script.id.toString(),
      details: { name: script.name },
    });

    return NextResponse.json(
      {
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
      },
      { status: 201 }
    );
  } catch (error) {
    console.error('Create UI script error:', error);
    return NextResponse.json({ error: 'UIスクリプトの作成に失敗しました。' }, { status: 500 });
  }
}
