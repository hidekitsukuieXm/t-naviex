import { ClaudeModel } from './claude';

export interface AiSettings {
  id: bigint;
  projectId: bigint | null;
  isEnabled: boolean;
  hasApiKey: boolean;
  maskedApiKey: string | null;
  model: ClaudeModel;
  maxTokens: number;
  temperature: number;
  usageToday: number;
  usageMonth: number;
  usageTotal: number;
  lastUsedAt: Date | null;
  lastTestedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface AiSettingsUpdate {
  isEnabled?: boolean;
  apiKey?: string;
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
}

export interface AiSettingsResponse {
  settings: AiSettings;
}

export interface AiTestConnectionResponse {
  success: boolean;
  message: string;
  model?: string;
  responseTime?: number;
}

export interface AiUsageStats {
  today: number;
  month: number;
  total: number;
  lastUsedAt: Date | null;
}

export const AVAILABLE_MODELS: { value: ClaudeModel; label: string; description: string }[] = [
  {
    value: 'claude-opus-4-20250514',
    label: 'Claude Opus 4',
    description: '最も高性能なモデル。複雑なタスクに最適。',
  },
  {
    value: 'claude-sonnet-4-20250514',
    label: 'Claude Sonnet 4',
    description: 'バランスの取れたモデル。多くのタスクに推奨。',
  },
  {
    value: 'claude-3-opus-20240229',
    label: 'Claude 3 Opus',
    description: '高性能な旧世代モデル。',
  },
  {
    value: 'claude-3-sonnet-20240229',
    label: 'Claude 3 Sonnet',
    description: 'コスト効率の良い旧世代モデル。',
  },
  {
    value: 'claude-3-haiku-20240307',
    label: 'Claude 3 Haiku',
    description: '高速で軽量なモデル。シンプルなタスクに最適。',
  },
];

export function validateMaxTokens(maxTokens: number): string | null {
  if (maxTokens < 1) return '最大トークン数は1以上である必要があります';
  if (maxTokens > 8192) return '最大トークン数は8192以下である必要があります';
  return null;
}

export function validateTemperature(temperature: number): string | null {
  if (temperature < 0) return '温度は0以上である必要があります';
  if (temperature > 1) return '温度は1以下である必要があります';
  return null;
}

export function validateApiKey(apiKey: string): string | null {
  if (!apiKey || apiKey.trim().length === 0) return null; // 空の場合は許可（削除を許可）
  if (!apiKey.startsWith('sk-ant-')) {
    return 'APIキーは "sk-ant-" で始まる必要があります';
  }
  if (apiKey.length < 20) {
    return 'APIキーの形式が正しくありません';
  }
  return null;
}
