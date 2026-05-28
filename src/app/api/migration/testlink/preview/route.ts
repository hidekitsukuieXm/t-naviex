/**
 * TestLink Migration Preview API
 * POST /api/migration/testlink/preview - インポートプレビュー生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateImportPreview, validateTestLinkXml } from '@/services/migration/testlink-importer';

// POST /api/migration/testlink/preview
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'XMLファイルが必要です。' }, { status: 400 });
    }

    // XMLコンテンツの読み取り
    const xmlContent = await file.text();

    // XMLのバリデーション
    const xmlValidation = validateTestLinkXml(xmlContent);
    if (!xmlValidation.valid) {
      return NextResponse.json({ error: xmlValidation.error }, { status: 400 });
    }

    // プレビュー生成
    const preview = generateImportPreview(xmlContent);

    if (!preview) {
      return NextResponse.json({ error: 'プレビューの生成に失敗しました。' }, { status: 400 });
    }

    return NextResponse.json({ preview }, { status: 200 });
  } catch (error) {
    console.error('TestLink preview error:', error);
    return NextResponse.json({ error: 'プレビューの生成に失敗しました。' }, { status: 500 });
  }
}
