// Claude API 型定義

export interface ClaudeMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface ClaudeRequestParams {
  messages: ClaudeMessage[];
  model?: ClaudeModel;
  maxTokens?: number;
  temperature?: number;
  systemPrompt?: string;
  stopSequences?: string[];
}

export interface ClaudeStreamRequestParams extends ClaudeRequestParams {
  onChunk?: (chunk: string) => void;
  onComplete?: (response: ClaudeResponse) => void;
  onError?: (error: ClaudeApiError) => void;
}

export interface ClaudeResponse {
  id: string;
  model: string;
  content: string;
  stopReason: 'end_turn' | 'max_tokens' | 'stop_sequence' | null;
  usage: ClaudeUsage;
}

export interface ClaudeUsage {
  inputTokens: number;
  outputTokens: number;
  totalTokens: number;
}

export interface ClaudeApiError {
  type:
    | 'authentication_error'
    | 'rate_limit_error'
    | 'api_error'
    | 'timeout_error'
    | 'unknown_error';
  message: string;
  statusCode?: number;
  retryAfter?: number;
}

export type ClaudeModel =
  | 'claude-3-opus-20240229'
  | 'claude-3-sonnet-20240229'
  | 'claude-3-haiku-20240307'
  | 'claude-sonnet-4-20250514'
  | 'claude-opus-4-20250514';

export interface ClaudeClientConfig {
  apiKey: string;
  maxRetries?: number;
  timeout?: number;
  baseUrl?: string;
}

export interface TokenCountResult {
  inputTokens: number;
}

export interface ClaudeRateLimitInfo {
  requestsLimit: number;
  requestsRemaining: number;
  requestsReset: Date;
  tokensLimit: number;
  tokensRemaining: number;
  tokensReset: Date;
}
