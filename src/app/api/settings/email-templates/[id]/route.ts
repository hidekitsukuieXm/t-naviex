import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getEmailTemplateById,
  updateEmailTemplate,
  deleteEmailTemplate,
} from '@/lib/repositories/email-template-repository';
import { validateEmailTemplate } from '@/types/email-template';

interface RouteParams {
  params: Promise<{ id: string }>;
}

// GET /api/settings/email-templates/[id] - メールテンプレート取得
export async function GET(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const template = await getEmailTemplateById(id);

    if (!template) {
      return NextResponse.json({ error: 'メールテンプレートが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Get email template error:', error);
    return NextResponse.json(
      { error: 'メールテンプレートの取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// PUT /api/settings/email-templates/[id] - メールテンプレート更新
export async function PUT(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;
    const body = await request.json();

    // バリデーション
    const validation = validateEmailTemplate(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.map((e) => e.message).join(' ') },
        { status: 400 }
      );
    }

    const template = await updateEmailTemplate(id, body);

    if (!template) {
      return NextResponse.json({ error: 'メールテンプレートが見つかりません。' }, { status: 404 });
    }

    return NextResponse.json(template);
  } catch (error) {
    console.error('Update email template error:', error);

    // ユニーク制約違反
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: '同じ名前のテンプレートが既に存在します。' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'メールテンプレートの更新に失敗しました。' },
      { status: 500 }
    );
  }
}

// DELETE /api/settings/email-templates/[id] - メールテンプレート削除
export async function DELETE(request: Request, { params }: RouteParams) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { id } = await params;

    // 存在確認
    const existing = await getEmailTemplateById(id);
    if (!existing) {
      return NextResponse.json({ error: 'メールテンプレートが見つかりません。' }, { status: 404 });
    }

    const deleted = await deleteEmailTemplate(id);

    if (!deleted) {
      return NextResponse.json(
        { error: 'メールテンプレートの削除に失敗しました。' },
        { status: 500 }
      );
    }

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Delete email template error:', error);
    return NextResponse.json(
      { error: 'メールテンプレートの削除に失敗しました。' },
      { status: 500 }
    );
  }
}
