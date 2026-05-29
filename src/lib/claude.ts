import Anthropic from '@anthropic-ai/sdk';
import {
  ClaudeClientConfig,
  ClaudeRequestParams,
  ClaudeStreamRequestParams,
  ClaudeResponse,
  ClaudeApiError,
  ClaudeUsage,
  ClaudeModel,
  ClaudeRateLimitInfo,
} from '@/types/claude';

const DEFAULT_MODEL: ClaudeModel = 'claude-sonnet-4-20250514';
const DEFAULT_MAX_TOKENS = 4096;
const DEFAULT_TIMEOUT = 60000; // 60 seconds
const DEFAULT_MAX_RETRIES = 3;

export class ClaudeClient {
  private client: Anthropic;
  private config: Required<ClaudeClientConfig>;
  private rateLimitInfo: ClaudeRateLimitInfo | null = null;
  private totalUsage: ClaudeUsage = {
    inputTokens: 0,
    outputTokens: 0,
    totalTokens: 0,
  };

  constructor(config: ClaudeClientConfig) {
    this.config = {
      apiKey: config.apiKey,
      maxRetries: config.maxRetries ?? DEFAULT_MAX_RETRIES,
      timeout: config.timeout ?? DEFAULT_TIMEOUT,
      baseUrl: config.baseUrl ?? 'https://api.anthropic.com',
    };

    this.client = new Anthropic({
      apiKey: this.config.apiKey,
      maxRetries: this.config.maxRetries,
      timeout: this.config.timeout,
      baseURL: this.config.baseUrl,
    });
  }

  /**
   * Send a message to Claude API and get a response
   */
  async sendMessage(params: ClaudeRequestParams): Promise<ClaudeResponse> {
    try {
      const response = await this.client.messages.create({
        model: params.model ?? DEFAULT_MODEL,
        max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
        messages: params.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        system: params.systemPrompt,
        temperature: params.temperature,
        stop_sequences: params.stopSequences,
      });

      const usage: ClaudeUsage = {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
        totalTokens: response.usage.input_tokens + response.usage.output_tokens,
      };

      this.trackUsage(usage);

      const content = response.content
        .filter((block) => block.type === 'text')
        .map((block) => (block as { type: 'text'; text: string }).text)
        .join('');

      return {
        id: response.id,
        model: response.model,
        content,
        stopReason: response.stop_reason as 'end_turn' | 'max_tokens' | 'stop_sequence' | null,
        usage,
      };
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Send a message with streaming response
   */
  async sendMessageStream(params: ClaudeStreamRequestParams): Promise<ClaudeResponse> {
    try {
      const stream = this.client.messages.stream({
        model: params.model ?? DEFAULT_MODEL,
        max_tokens: params.maxTokens ?? DEFAULT_MAX_TOKENS,
        messages: params.messages.map((msg) => ({
          role: msg.role,
          content: msg.content,
        })),
        system: params.systemPrompt,
        temperature: params.temperature,
        stop_sequences: params.stopSequences,
      });

      let fullContent = '';

      stream.on('text', (text) => {
        fullContent += text;
        params.onChunk?.(text);
      });

      const finalMessage = await stream.finalMessage();

      const usage: ClaudeUsage = {
        inputTokens: finalMessage.usage.input_tokens,
        outputTokens: finalMessage.usage.output_tokens,
        totalTokens: finalMessage.usage.input_tokens + finalMessage.usage.output_tokens,
      };

      this.trackUsage(usage);

      const response: ClaudeResponse = {
        id: finalMessage.id,
        model: finalMessage.model,
        content: fullContent,
        stopReason: finalMessage.stop_reason as 'end_turn' | 'max_tokens' | 'stop_sequence' | null,
        usage,
      };

      params.onComplete?.(response);

      return response;
    } catch (error) {
      const apiError = this.handleError(error);
      params.onError?.(apiError);
      throw apiError;
    }
  }

  /**
   * Count tokens for a given text
   */
  async countTokens(text: string, model?: ClaudeModel): Promise<number> {
    try {
      const result = await this.client.messages.countTokens({
        model: model ?? DEFAULT_MODEL,
        messages: [{ role: 'user', content: text }],
      });
      return result.input_tokens;
    } catch (error) {
      throw this.handleError(error);
    }
  }

  /**
   * Check if rate limit allows request
   */
  isRateLimitOk(): boolean {
    if (!this.rateLimitInfo) return true;
    return this.rateLimitInfo.requestsRemaining > 0 && this.rateLimitInfo.tokensRemaining > 0;
  }

  /**
   * Get time until rate limit reset
   */
  getTimeUntilReset(): number {
    if (!this.rateLimitInfo) return 0;
    const now = new Date();
    const resetTime = new Date(
      Math.min(this.rateLimitInfo.requestsReset.getTime(), this.rateLimitInfo.tokensReset.getTime())
    );
    return Math.max(0, resetTime.getTime() - now.getTime());
  }

  /**
   * Get current usage statistics
   */
  getUsageStats(): ClaudeUsage {
    return { ...this.totalUsage };
  }

  /**
   * Reset usage statistics
   */
  resetUsageStats(): void {
    this.totalUsage = {
      inputTokens: 0,
      outputTokens: 0,
      totalTokens: 0,
    };
  }

  /**
   * Get rate limit info
   */
  getRateLimitInfo(): ClaudeRateLimitInfo | null {
    return this.rateLimitInfo ? { ...this.rateLimitInfo } : null;
  }

  private trackUsage(usage: ClaudeUsage): void {
    this.totalUsage.inputTokens += usage.inputTokens;
    this.totalUsage.outputTokens += usage.outputTokens;
    this.totalUsage.totalTokens += usage.totalTokens;
  }

  private handleError(error: unknown): ClaudeApiError {
    // Check for API errors (either real Anthropic.APIError or mock errors with status)
    const isApiError =
      error instanceof Anthropic.APIError ||
      (error instanceof Error &&
        'status' in error &&
        typeof (error as { status: unknown }).status === 'number');

    if (isApiError && error instanceof Error) {
      const status = (error as { status: number }).status;
      const headers = (error as { headers?: { get?: (key: string) => string | null } }).headers;

      // Rate limit error
      if (status === 429) {
        const retryAfter = this.parseRetryAfter(headers?.get?.('retry-after'));
        return {
          type: 'rate_limit_error',
          message: error.message || 'Rate limit exceeded',
          statusCode: status,
          retryAfter,
        };
      }

      // Authentication error
      if (status === 401) {
        return {
          type: 'authentication_error',
          message: error.message || 'Invalid API key',
          statusCode: status,
        };
      }

      // Other API errors
      return {
        type: 'api_error',
        message: error.message || 'API request failed',
        statusCode: status,
      };
    }

    // Timeout error
    if (error instanceof Error && error.name === 'TimeoutError') {
      return {
        type: 'timeout_error',
        message: 'Request timed out',
      };
    }

    // Unknown error
    return {
      type: 'unknown_error',
      message: error instanceof Error ? error.message : 'An unknown error occurred',
    };
  }

  private parseRetryAfter(header: string | null | undefined): number | undefined {
    if (!header) return undefined;
    const seconds = parseInt(header, 10);
    return isNaN(seconds) ? undefined : seconds * 1000;
  }
}

// Singleton instance for application-wide use
let defaultClient: ClaudeClient | null = null;

export function initializeClaudeClient(config: ClaudeClientConfig): ClaudeClient {
  defaultClient = new ClaudeClient(config);
  return defaultClient;
}

export function getClaudeClient(): ClaudeClient {
  if (!defaultClient) {
    throw new Error('Claude client not initialized. Call initializeClaudeClient first.');
  }
  return defaultClient;
}

export function hasClaudeClient(): boolean {
  return defaultClient !== null;
}
