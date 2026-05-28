/**
 * Zephyr Migration API
 * POST /api/migration/zephyr - Zephyrからのインポート実行
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { importFromZephyr, validateZephyrData } from '@/services/migration/zephyr-importer';

// POST /api/migration/zephyr
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
      return NextResponse.json({ error: 'ファイルが必要です。' }, { status: 400 });
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

    // インポート実行
    const result = await importFromZephyr(content, format, options, BigInt(session.user.id));

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('Zephyr import error:', error);
    return NextResponse.json({ error: 'Zephyrからのインポートに失敗しました。' }, { status: 500 });
  }
}
