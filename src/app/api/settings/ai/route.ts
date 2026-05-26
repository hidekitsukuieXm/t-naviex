import { NextRequest, NextResponse } from 'next/server';
import { aiSettingsRepository } from '@/repositories/ai-settings-repository';
import { validateMaxTokens, validateTemperature, validateApiKey } from '@/types/ai-settings';
import { ClaudeModel } from '@/types/claude';

/**
 * GET /api/settings/ai
 * AI設定を取得
 */
export async function GET(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const settings = await aiSettingsRepository.getOrCreateSettings(projectId);

    return NextResponse.json({
      settings: {
        ...settings,
        id: settings.id.toString(),
        projectId: settings.projectId?.toString() ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to get AI settings:', error);
    return NextResponse.json({ error: 'AI設定の取得に失敗しました' }, { status: 500 });
  }
}

/**
 * PATCH /api/settings/ai
 * AI設定を更新
 */
export async function PATCH(request: NextRequest) {
  try {
    const projectIdParam = request.nextUrl.searchParams.get('projectId');
    const projectId = projectIdParam ? BigInt(projectIdParam) : null;

    const body = await request.json();
    const { isEnabled, apiKey, model, maxTokens, temperature } = body;

    // Validation
    if (maxTokens !== undefined) {
      const maxTokensError = validateMaxTokens(maxTokens);
      if (maxTokensError) {
        return NextResponse.json({ error: maxTokensError }, { status: 400 });
      }
    }

    if (temperature !== undefined) {
      const temperatureError = validateTemperature(temperature);
      if (temperatureError) {
        return NextResponse.json({ error: temperatureError }, { status: 400 });
      }
    }

    if (apiKey !== undefined) {
      const apiKeyError = validateApiKey(apiKey);
      if (apiKeyError) {
        return NextResponse.json({ error: apiKeyError }, { status: 400 });
      }
    }

    const settings = await aiSettingsRepository.updateSettings(projectId, {
      isEnabled,
      apiKey,
      model: model as ClaudeModel,
      maxTokens,
      temperature,
    });

    return NextResponse.json({
      settings: {
        ...settings,
        id: settings.id.toString(),
        projectId: settings.projectId?.toString() ?? null,
      },
    });
  } catch (error) {
    console.error('Failed to update AI settings:', error);
    return NextResponse.json({ error: 'AI設定の更新に失敗しました' }, { status: 500 });
  }
}
