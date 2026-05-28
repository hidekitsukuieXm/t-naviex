/**
 * TD Tool Import API
 * POST /api/integrations/td/import - TDツールからのインポート実行
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  importFromTdTool,
  validateTdToolImportOptions,
} from '@/services/integrations/td-tool-service';
import type { TdToolConfig, TdToolImportOptions } from '@/services/integrations/td-tool-service';

// POST /api/integrations/td/import
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const formData = await request.formData();
    const file = formData.get('file') as File | null;
    const configStr = formData.get('config') as string | null;
    const optionsStr = formData.get('options') as string | null;

    if (!file) {
      return NextResponse.json({ error: 'ファイルが必要です。' }, { status: 400 });
    }

    if (!optionsStr) {
      return NextResponse.json({ error: 'インポートオプションが必要です。' }, { status: 400 });
    }

    // 設定のパース
    let config: TdToolConfig = { format: 'json' };
    if (configStr) {
      try {
        config = JSON.parse(configStr);
      } catch {
        return NextResponse.json({ error: '設定の形式が不正です。' }, { status: 400 });
      }
    }

    // オプションのパース
    let options: TdToolImportOptions;
    try {
      options = JSON.parse(optionsStr);
    } catch {
      return NextResponse.json(
        { error: 'インポートオプションの形式が不正です。' },
        { status: 400 }
      );
    }

    // オプションのバリデーション
    const optionsValidation = validateTdToolImportOptions(options);
    if (!optionsValidation.valid) {
      return NextResponse.json({ error: optionsValidation.errors.join(' ') }, { status: 400 });
    }

    // ファイルフォーマットの判定
    const fileName = file.name.toLowerCase();
    if (fileName.endsWith('.json')) {
      config.format = 'json';
    } else if (fileName.endsWith('.xml')) {
      config.format = 'xml';
    } else if (fileName.endsWith('.csv')) {
      config.format = 'csv';
    }

    // コンテンツの読み取り
    const content = await file.text();

    if (!content || content.trim() === '') {
      return NextResponse.json({ error: 'ファイルが空です。' }, { status: 400 });
    }

    // インポート実行
    const result = await importFromTdTool(content, config, options, BigInt(session.user.id));

    if (result.success) {
      return NextResponse.json(result, { status: 200 });
    } else {
      return NextResponse.json(result, { status: 400 });
    }
  } catch (error) {
    console.error('TD Tool import error:', error);
    return NextResponse.json(
      { error: 'TDツールからのインポートに失敗しました。' },
      { status: 500 }
    );
  }
}
