import { NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  getEmailTemplates,
  createEmailTemplate,
  initializeDefaultTemplates,
} from '@/lib/repositories/email-template-repository';
import { validateEmailTemplate, DEFAULT_TEMPLATES } from '@/types/email-template';
import type { EmailTemplateType, EmailTemplateSearchParams } from '@/types/email-template';

// GET /api/settings/email-templates - メールテンプレート一覧取得
export async function GET(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const { searchParams } = new URL(request.url);

    const params: EmailTemplateSearchParams = {
      type: searchParams.get('type') as EmailTemplateType | undefined,
      isActive: searchParams.get('isActive') ? searchParams.get('isActive') === 'true' : undefined,
      query: searchParams.get('query') || undefined,
      page: searchParams.get('page') ? parseInt(searchParams.get('page')!) : 1,
      limit: searchParams.get('limit') ? parseInt(searchParams.get('limit')!) : 20,
    };

    // 初期化パラメータが指定された場合はデフォルトテンプレートを初期化
    if (searchParams.get('initialize') === 'true') {
      const created = await initializeDefaultTemplates(DEFAULT_TEMPLATES);
      if (created > 0) {
        console.log(`Initialized ${created} default email templates`);
      }
    }

    const result = await getEmailTemplates(params);

    return NextResponse.json(result);
  } catch (error) {
    console.error('Get email templates error:', error);
    return NextResponse.json(
      { error: 'メールテンプレートの取得に失敗しました。' },
      { status: 500 }
    );
  }
}

// POST /api/settings/email-templates - メールテンプレート作成
export async function POST(request: Request) {
  try {
    const session = await auth();

    if (!session?.user) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();

    // バリデーション
    const validation = validateEmailTemplate(body);
    if (!validation.valid) {
      return NextResponse.json(
        { error: validation.errors.map((e) => e.message).join(' ') },
        { status: 400 }
      );
    }

    // 必須フィールドのチェック
    if (!body.name || !body.subject || !body.body) {
      return NextResponse.json(
        { error: 'テンプレート名、件名、本文は必須です。' },
        { status: 400 }
      );
    }

    const template = await createEmailTemplate(body);

    return NextResponse.json(template, { status: 201 });
  } catch (error) {
    console.error('Create email template error:', error);

    // ユニーク制約違反
    if (error instanceof Error && error.message.includes('Unique constraint')) {
      return NextResponse.json(
        { error: '同じ名前のテンプレートが既に存在します。' },
        { status: 409 }
      );
    }

    return NextResponse.json(
      { error: 'メールテンプレートの作成に失敗しました。' },
      { status: 500 }
    );
  }
}
