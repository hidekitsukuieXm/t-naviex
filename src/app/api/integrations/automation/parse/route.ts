/**
 * Automation Test Results Parse API
 * POST /api/integrations/automation/parse - Parse automation test results
 */

import { NextRequest, NextResponse } from 'next/server';
import { auth } from '@/lib/auth';
import {
  detectAndParseReport,
  parsePlaywrightJson,
  parseJUnitXml,
  parseTestNGXml,
} from '@/services/automation-client';
import { z } from 'zod';

const parseSchema = z.object({
  content: z.string().min(1, 'コンテンツは必須です'),
  format: z.enum(['auto', 'playwright', 'junit', 'testng']).optional().default('auto'),
});

// POST /api/integrations/automation/parse
export async function POST(request: NextRequest) {
  try {
    const session = await auth();

    if (!session?.user?.id) {
      return NextResponse.json({ error: '認証が必要です。' }, { status: 401 });
    }

    // Parse request body
    const body = await request.json();
    const validation = parseSchema.safeParse(body);

    if (!validation.success) {
      return NextResponse.json(
        { error: validation.error.issues[0]?.message || 'バリデーションエラー' },
        { status: 400 }
      );
    }

    const { content, format } = validation.data;

    // Parse based on format
    let result;
    switch (format) {
      case 'playwright':
        result = parsePlaywrightJson(content);
        break;
      case 'junit':
        result = parseJUnitXml(content);
        break;
      case 'testng':
        result = parseTestNGXml(content);
        break;
      case 'auto':
      default:
        result = detectAndParseReport(content);
    }

    if (!result.success) {
      return NextResponse.json({ error: result.error }, { status: 400 });
    }

    return NextResponse.json({
      success: true,
      report: result.data,
    });
  } catch (error) {
    console.error('Parse automation results error:', error);
    return NextResponse.json({ error: 'テスト結果の解析に失敗しました。' }, { status: 500 });
  }
}
