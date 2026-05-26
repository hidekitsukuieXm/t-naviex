import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { ClaudeClient } from '../claude';
import Anthropic from '@anthropic-ai/sdk';

// Mock APIError class
class MockAPIError extends Error {
  status: number;
  headers?: { get?: (key: string) => string | null };

  constructor(message: string, status: number, headers?: { get?: (key: string) => string | null }) {
    super(message);
    this.status = status;
    this.headers = headers;
    this.name = 'APIError';
  }
}

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  const mockCreate = vi.fn();
  const mockStream = vi.fn();
  const mockCountTokens = vi.fn();

  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: mockCreate,
        stream: mockStream,
        countTokens: mockCountTokens,
      },
    })),
  };
});

// Add APIError to the mock
(Anthropic as unknown as { APIError: typeof MockAPIError }).APIError = MockAPIError;

describe('ClaudeClient', () => {
  let client: ClaudeClient;
  let mockAnthropicInstance: {
    messages: {
      create: ReturnType<typeof vi.fn>;
      stream: ReturnType<typeof vi.fn>;
      countTokens: ReturnType<typeof vi.fn>;
    };
  };

  beforeEach(() => {
    vi.clearAllMocks();
    client = new ClaudeClient({ apiKey: 'test-api-key' });
    mockAnthropicInstance = (Anthropic as unknown as ReturnType<typeof vi.fn>).mock.results[0]
      .value;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('constructor', () => {
    it('should initialize with required config', () => {
      const newClient = new ClaudeClient({ apiKey: 'test-key' });
      expect(Anthropic).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'test-key',
          maxRetries: 3,
          timeout: 60000,
        })
      );
      expect(newClient).toBeDefined();
    });

    it('should initialize with custom config', () => {
      new ClaudeClient({
        apiKey: 'test-key',
        maxRetries: 5,
        timeout: 30000,
        baseUrl: 'https://custom.api.com',
      });
      expect(Anthropic).toHaveBeenCalledWith(
        expect.objectContaining({
          apiKey: 'test-key',
          maxRetries: 5,
          timeout: 30000,
          baseURL: 'https://custom.api.com',
        })
      );
    });
  });

  describe('sendMessage', () => {
    it('should send message and return response', async () => {
      const mockResponse = {
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Hello!' }],
        stop_reason: 'end_turn',
        usage: {
          input_tokens: 10,
          output_tokens: 5,
        },
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      const response = await client.sendMessage({
        messages: [{ role: 'user', content: 'Hi' }],
      });

      expect(response).toEqual({
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: 'Hello!',
        stopReason: 'end_turn',
        usage: {
          inputTokens: 10,
          outputTokens: 5,
          totalTokens: 15,
        },
      });
    });

    it('should use custom model and parameters', async () => {
      const mockResponse = {
        id: 'msg_456',
        model: 'claude-3-opus-20240229',
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'max_tokens',
        usage: { input_tokens: 20, output_tokens: 100 },
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      await client.sendMessage({
        messages: [{ role: 'user', content: 'Test' }],
        model: 'claude-3-opus-20240229',
        maxTokens: 1000,
        temperature: 0.7,
        systemPrompt: 'You are helpful',
        stopSequences: ['END'],
      });

      expect(mockAnthropicInstance.messages.create).toHaveBeenCalledWith({
        model: 'claude-3-opus-20240229',
        max_tokens: 1000,
        messages: [{ role: 'user', content: 'Test' }],
        system: 'You are helpful',
        temperature: 0.7,
        stop_sequences: ['END'],
      });
    });

    it('should track usage statistics', async () => {
      const mockResponse = {
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      await client.sendMessage({ messages: [{ role: 'user', content: 'Test' }] });
      await client.sendMessage({ messages: [{ role: 'user', content: 'Test 2' }] });

      const stats = client.getUsageStats();
      expect(stats).toEqual({
        inputTokens: 200,
        outputTokens: 100,
        totalTokens: 300,
      });
    });
  });

  describe('sendMessageStream', () => {
    it('should handle streaming response', async () => {
      const mockFinalMessage = {
        id: 'msg_stream_123',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Streamed content' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 15, output_tokens: 25 },
      };

      const eventHandlers: Record<string, (data: unknown) => void> = {};
      const mockStreamInstance = {
        on: vi.fn((event: string, handler: (data: unknown) => void) => {
          eventHandlers[event] = handler;
          return mockStreamInstance;
        }),
        finalMessage: vi.fn().mockResolvedValue(mockFinalMessage),
      };

      mockAnthropicInstance.messages.stream.mockReturnValue(mockStreamInstance);

      const onChunk = vi.fn();
      const onComplete = vi.fn();

      const responsePromise = client.sendMessageStream({
        messages: [{ role: 'user', content: 'Stream test' }],
        onChunk,
        onComplete,
      });

      // Simulate streaming
      if (eventHandlers.text) {
        eventHandlers.text('Hello ');
        eventHandlers.text('World!');
      }

      const response = await responsePromise;

      expect(response.id).toBe('msg_stream_123');
      expect(onChunk).toHaveBeenCalledWith('Hello ');
      expect(onChunk).toHaveBeenCalledWith('World!');
      expect(onComplete).toHaveBeenCalled();
    });
  });

  describe('countTokens', () => {
    it('should count tokens for text', async () => {
      mockAnthropicInstance.messages.countTokens.mockResolvedValue({
        input_tokens: 42,
      });

      const count = await client.countTokens('Test text');
      expect(count).toBe(42);
    });
  });

  describe('error handling', () => {
    it('should handle rate limit error', async () => {
      const rateLimitError = new MockAPIError('Rate limit exceeded', 429, {
        get: () => '30',
      });

      mockAnthropicInstance.messages.create.mockRejectedValue(rateLimitError);

      await expect(
        client.sendMessage({ messages: [{ role: 'user', content: 'Test' }] })
      ).rejects.toMatchObject({
        type: 'rate_limit_error',
        statusCode: 429,
        retryAfter: 30000,
      });
    });

    it('should handle authentication error', async () => {
      const authError = new MockAPIError('Invalid API key', 401);

      mockAnthropicInstance.messages.create.mockRejectedValue(authError);

      await expect(
        client.sendMessage({ messages: [{ role: 'user', content: 'Test' }] })
      ).rejects.toMatchObject({
        type: 'authentication_error',
        statusCode: 401,
      });
    });

    it('should handle generic API error', async () => {
      const apiError = new MockAPIError('Server error', 500);

      mockAnthropicInstance.messages.create.mockRejectedValue(apiError);

      await expect(
        client.sendMessage({ messages: [{ role: 'user', content: 'Test' }] })
      ).rejects.toMatchObject({
        type: 'api_error',
        statusCode: 500,
      });
    });

    it('should handle unknown error', async () => {
      const unknownError = new Error('Network error');

      mockAnthropicInstance.messages.create.mockRejectedValue(unknownError);

      await expect(
        client.sendMessage({ messages: [{ role: 'user', content: 'Test' }] })
      ).rejects.toMatchObject({
        type: 'unknown_error',
        message: 'Network error',
      });
    });
  });

  describe('usage tracking', () => {
    it('should reset usage stats', async () => {
      const mockResponse = {
        id: 'msg_123',
        model: 'claude-sonnet-4-20250514',
        content: [{ type: 'text', text: 'Response' }],
        stop_reason: 'end_turn',
        usage: { input_tokens: 100, output_tokens: 50 },
      };

      mockAnthropicInstance.messages.create.mockResolvedValue(mockResponse);

      await client.sendMessage({ messages: [{ role: 'user', content: 'Test' }] });
      expect(client.getUsageStats().totalTokens).toBe(150);

      client.resetUsageStats();
      expect(client.getUsageStats()).toEqual({
        inputTokens: 0,
        outputTokens: 0,
        totalTokens: 0,
      });
    });
  });

  describe('rate limit', () => {
    it('should check rate limit status', () => {
      expect(client.isRateLimitOk()).toBe(true);
    });

    it('should return time until reset', () => {
      expect(client.getTimeUntilReset()).toBe(0);
    });

    it('should return null for rate limit info when not set', () => {
      expect(client.getRateLimitInfo()).toBeNull();
    });
  });
});

describe('Singleton functions', () => {
  it('should work with initializeClaudeClient and getClaudeClient', async () => {
    // Import fresh modules
    const { initializeClaudeClient, getClaudeClient, hasClaudeClient } = await import('../claude');

    // Initialize should work
    const client = initializeClaudeClient({ apiKey: 'test-key' });
    expect(client).toBeDefined();
    expect(hasClaudeClient()).toBe(true);
    expect(getClaudeClient()).toBeDefined();
  });
});
