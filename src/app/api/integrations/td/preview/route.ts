/**
 * TD Tool Preview API
 * POST /api/integrations/td/preview - インポートプレビュー生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { generateTdToolImportPreview } from '@/services/integrations/td-tool-service';
import type { TdToolConfig } from '@/services/integrations/td-tool-service';

// POST /api/integrations/td/preview
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'ファイルが必要です。' }, { status: 400 });
    }

    // ファイルフォーマットの判定
    const fileName = file.name.toLowerCase();
    let format: 'json' | 'xml' | 'csv' = 'json';

    if (fileName.endsWith('.json')) {
      format = 'json';
    } else if (fileName.endsWith('.xml')) {
      format = 'xml';
    } else if (fileName.endsWith('.csv')) {
      format = 'csv';
    } else {
      return NextResponse.json(
        { error: 'サポートされていないファイル形式です。' },
        { status: 400 }
      );
    }

    const config: TdToolConfig = { format };

    // コンテンツの読み取り
    const content = await file.text();

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'ファイルが空です。' }, { status: 400 });
    }

    // プレビュー生成
    const preview = generateTdToolImportPreview(content, config);

    if (!preview) {
      return NextResponse.json({ error: 'プレビューの生成に失敗しました。' }, { status: 400 });
    }

    return NextResponse.json({ preview }, { status: 200 });
  } catch (error) {
    console.error('TD Tool preview error:', error);
    return NextResponse.json({ error: 'プレビューの生成に失敗しました。' }, { status: 500 });
  }
}
