/**
 * Zephyr Migration Preview API
 * POST /api/migration/zephyr/preview - インポートプレビュー生成
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  generateZephyrImportPreview,
  validateZephyrData,
} from '@/services/migration/zephyr-importer';

// POST /api/migration/zephyr/preview
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

    // ファイル形式の判定
    const fileName = file.name.toLowerCase();
    let format: 'json' | 'excel';
    let content: string | ArrayBuffer;

    if (fileName.endsWith('.json')) {
      format = 'json';
      content = await file.text();
    } else if (fileName.endsWith('.xlsx') || fileName.endsWith('.xls')) {
      format = 'excel';
      content = await file.arrayBuffer();
    } else {
      return NextResponse.json(
        {
          error:
            'サポートされていないファイル形式です。JSON または Excel ファイルを使用してください。',
        },
        { status: 400 }
      );
    }

    // バリデーション
    const validation = validateZephyrData(content, format);
    if (!validation.valid) {
      return NextResponse.json({ error: validation.error }, { status: 400 });
    }

    // プレビュー生成
    const preview = generateZephyrImportPreview(content, format);

    if (!preview) {
      return NextResponse.json({ error: 'プレビューの生成に失敗しました。' }, { status: 400 });
    }

    return NextResponse.json({ preview }, { status: 200 });
  } catch (error) {
    console.error('Zephyr preview error:', error);
    return NextResponse.json({ error: 'プレビューの生成に失敗しました。' }, { status: 500 });
  }
}
