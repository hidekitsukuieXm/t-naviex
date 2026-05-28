/**
 * XML Import Preview API
 * POST /api/import/xml/preview - プレビュー生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateXmlImportPreview, detectXmlFields } from '@/services/import/xml-importer';

// POST /api/import/xml/preview
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const configStr = formData.get('config') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'XMLファイルが必要です。' }, { status: 400 });
    }

    // XMLコンテンツの読み取り
    const xmlContent = await file.text();

    if (!xmlContent || xmlContent.trim() === '') {
      return NextResponse.json({ error: 'XMLコンテンツが空です。' }, { status: 400 });
    }

    // 設定がある場合はプレビュー生成
    if (configStr) {
      let config;
      try {
        config = JSON.parse(configStr);
      } catch {
        return NextResponse.json({ error: '設定の形式が不正です。' }, { status: 400 });
      }

      const preview = generateXmlImportPreview(xmlContent, config);

      if (!preview) {
        return NextResponse.json({ error: 'プレビューの生成に失敗しました。' }, { status: 400 });
      }

      return NextResponse.json({ preview }, { status: 200 });
    }

    // 設定がない場合はフィールド検出
    const detection = detectXmlFields(xmlContent);

    if (!detection.success) {
      return NextResponse.json({ error: detection.error }, { status: 400 });
    }

    return NextResponse.json(
      {
        fields: detection.fields,
        sampleData: detection.sampleData,
      },
      { status: 200 }
    );
  } catch (error) {
    console.error('XML preview error:', error);
    return NextResponse.json({ error: 'プレビューの生成に失敗しました。' }, { status: 500 });
  }
}
