import { NextRequest, NextResponse } from 'next/server';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { ClaudeClient } from '@/lib/claude';
import { AiTestConnectionResponse } from '@/types/ai-settings';

/**
 * POST /api/settings/ai/test-connection
 * AI接続テスト
 */
export async function POST(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    // APIキーを取得
    const apiKey = await aiSettingsRepository.getDecryptedApiKey(projectId);

    if (!apiKey) {
      const response: AiTestConnectionResponse = {
        success: false,
        message: 'APIキーが設定されていません',
      };
      return NextResponse.json(response);
    }

    // 設定を取得
    const settings = await aiSettingsRepository.getOrCreateSettings(projectId);

    // Claude クライアントを作成
    const client = new ClaudeClient({
      apiKey,
      timeout: 30000,
      maxRetries: 1,
    });

    // テストメッセージを送信
    const startTime = Date.now();

    try {
      const result = await client.sendMessage({
        messages: [
          { role: 'user', content: 'Hello, this is a connection test. Please respond with "OK".' },
        ],
        model: settings.model,
        maxTokens: 10,
      });

      const responseTime = Date.now() - startTime;

      // 接続テスト日時を更新
      await aiSettingsRepository.updateLastTestedAt(projectId);

      const response: AiTestConnectionResponse = {
        success: true,
        message: '接続テストに成功しました',
        model: result.model,
        responseTime,
      };

      return NextResponse.json(response);
    } catch (error) {
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const response: AiTestConnectionResponse = {
        success: false,
        message: `接続テストに失敗しました: ${errorMessage}`,
      };
      return NextResponse.json(response);
    }
  } catch (error) {
    console.error('Failed to test AI connection:', error);
    return NextResponse.json(
      { success: false, message: '接続テストの実行に失敗しました' },
      { status: 500 }
    );
  }
}
