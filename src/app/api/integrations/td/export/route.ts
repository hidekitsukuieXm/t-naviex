/**
 * TD Tool Export API
 * POST /api/integrations/td/export - TDツール形式でエクスポート
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import { exportToTdTool } from '@/services/integrations/td-tool-service';
import type { TdToolExportOptions } from '@/services/integrations/td-tool-service';

// POST /api/integrations/td/export
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    const body = await request.json();
    const options = body as TdToolExportOptions;

    // バリデーション
    if (!options.testSpecId || options.testSpecId.trim() === '') {
      return NextResponse.json({ error: 'テスト仕様書IDは必須です。' }, { status: 400 });
    }

    if (!options.format) {
      options.format = 'json';
    }

    // エクスポート実行
    const result = await exportToTdTool(options);

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    // レスポンスの返却
    const contentType =
      options.format === 'json'
        ? 'application/json'
        : options.format === 'xml'
          ? 'application/xml'
          : 'text/csv';

    const fileName = `td_export_${Date.now()}.${options.format}`;

    return new NextResponse(result.content, {
      status: 200,
      headers: {
        'Content-Type': contentType,
        'Content-Disposition': `attachment; filename="${fileName}"`,
      },
    });
  } catch (error) {
    console.error('TD Tool export error:', error);
    return NextResponse.json({ error: 'エクスポートに失敗しました。' }, { status: 500 });
  }
}
