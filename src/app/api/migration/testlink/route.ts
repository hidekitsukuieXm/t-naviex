/**
 * TestLink Migration API
 * POST /api/migration/testlink - TestLinkからのインポート実行
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { importFromTestLink, validateTestLinkXml } from '@/services/migration/testlink-importer';
import { validateTestLinkImportOptions } from '@/types/migration';

// POST /api/migration/testlink
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const optionsStr = formData.get('options') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'XMLファイルが必要です。' }, { status: 400 });
    }

    if (!optionsStr) {
      return NextResponse.json({ error: 'インポートオプションが必要です。' }, { status: 400 });
    }

    // オプションのパース
    let options;
    try {
      options = JSON.parse(optionsStr);
    } catch {
      return NextResponse.json(
        { error: 'インポートオプションの形式が不正です。' },
        { status: 400 }
      );
    }

    // オプションのバリデーション
    const optionsValidation = validateTestLinkImportOptions(options);
    if (!optionsValidation.valid) {
      return NextResponse.json({ error: optionsValidation.errors.join(' ') }, { status: 400 });
    }

    // XMLコンテンツの読み取り
    const xmlContent = await file.text();

    // XMLのバリデーション
    const xmlValidation = validateTestLinkXml(xmlContent);
    if (!xmlValidation.valid) {
      return NextResponse.json({ error: xmlValidation.error }, { status: 400 });
    }

    // インポート実行
    const result = await importFromTestLink(xmlContent, options, BigInt(session.user.id));

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('TestLink import error:', error);
    return NextResponse.json(
      { error: 'TestLinkからのインポートに失敗しました。' },
      { status: 500 }
    );
  }
}
