/**
 * AnthropicProvider 单元测试
 */

import { describe, it, expect, vi, beforeEach } from 'vitest';
import { AnthropicProvider } from '../providers/anthropic.js';
import type { LLMCompletionParams } from '../types.js';

// Mock Anthropic SDK
vi.mock('@anthropic-ai/sdk', () => {
  return {
    default: vi.fn().mockImplementation(() => ({
      messages: {
        create: vi.fn().mockResolvedValue({
          content: [{ type: 'text', text: 'Test response' }],
          usage: { input_tokens: 10, output_tokens: 20 },
        }),
      },
    })),
  };
});

describe('AnthropicProvider', () => {
  let provider: AnthropicProvider;

  beforeEach(() => {
    provider = new AnthropicProvider({
      apiKey: 'test-api-key',
    });
  });

  it('should have correct provider name', () => {
    expect(provider.providerName).toBe('anthropic');
  });

  it('should create completion successfully', async () => {
    const params: LLMCompletionParams = {
      model: 'claude-3-5-haiku-20241022',
      messages: [{ role: 'user', content: 'Hello' }],
      maxTokens: 1000,
      temperature: 0.7,
    };

    const response = await provider.createCompletion(params);

    expect(response.content).toBe('Test response');
    expect(response.usage).toEqual({
      inputTokens: 10,
      outputTokens: 20,
    });
  });

  it('should support CCR mode with dummy API key', () => {
    const ccrProvider = new AnthropicProvider({
      baseURL: 'http://127.0.0.1:3456',
    });

    expect(ccrProvider.providerName).toBe('anthropic');
  });

  it('should handle system prompt', async () => {
    const params: LLMCompletionParams = {
      model: 'claude-3-5-haiku-20241022',
      messages: [{ role: 'user', content: 'Hello' }],
      systemPrompt: 'You are a helpful assistant',
    };

    const response = await provider.createCompletion(params);
    expect(response.content).toBe('Test response');
  });
});
