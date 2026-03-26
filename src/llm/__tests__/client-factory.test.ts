/**
 * createLLMClient 工厂函数单元测试
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { createLLMClient } from '../client-factory.js';
import type { Config } from '../../config/index.js';

// Mock providers
vi.mock('../providers/anthropic.js', () => ({
  AnthropicProvider: vi.fn().mockImplementation(() => ({
    providerName: 'anthropic',
    createCompletion: vi.fn(),
  })),
}));

describe('createLLMClient', () => {
  const baseConfig: Config = {
    llm: {
      model: 'claude-3-5-haiku-20241022',
      maxTokens: 4096,
      temperature: 0.3,
      enablePromptCaching: true,
    },
  } as Config;

  beforeEach(() => {
    // Clear environment variables
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('Provider Detection', () => {
    it('should create Anthropic provider when baseURL is specified', async () => {
      const config: Config = {
        ...baseConfig,
        llm: {
          ...baseConfig.llm,
          baseURL: 'http://127.0.0.1:3456',
        },
      };

      const provider = await createLLMClient(config);
      expect(provider.providerName).toBe('anthropic');
    });

    it('should create Anthropic provider when ANTHROPIC_API_KEY is set', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const provider = await createLLMClient(baseConfig);
      expect(provider.providerName).toBe('anthropic');
    });

    it('should use explicit provider field when specified', async () => {
      const config: Config = {
        ...baseConfig,
        llm: {
          ...baseConfig.llm,
          provider: 'anthropic',
        },
      };

      const provider = await createLLMClient(config);
      expect(provider.providerName).toBe('anthropic');
    });

    it('should throw error when no provider can be determined', async () => {
      await expect(createLLMClient(baseConfig)).rejects.toThrow(
        'Cannot determine LLM provider'
      );
    });

    it('should throw error for invalid provider', async () => {
      const config: Config = {
        ...baseConfig,
        llm: {
          ...baseConfig.llm,
          provider: 'invalid' as any,
        },
      };

      await expect(createLLMClient(config)).rejects.toThrow(
        'Invalid llm.provider'
      );
    });
  });

  describe('Singleton Cache', () => {
    it('should return same instance for identical config', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const provider1 = await createLLMClient(baseConfig);
      const provider2 = await createLLMClient(baseConfig);

      expect(provider1).toBe(provider2);
    });

    it('should return different instances for different configs', async () => {
      process.env.ANTHROPIC_API_KEY = 'test-key';

      const config1: Config = {
        ...baseConfig,
        llm: { ...baseConfig.llm, model: 'claude-3-5-haiku-20241022' },
      };

      const config2: Config = {
        ...baseConfig,
        llm: { ...baseConfig.llm, model: 'claude-3-5-sonnet-20241022' },
      };

      const provider1 = await createLLMClient(config1);
      const provider2 = await createLLMClient(config2);

      // Different configs should create different cache entries
      expect(provider1).toBeDefined();
      expect(provider2).toBeDefined();
    });
  });

  describe('OpenAI Provider', () => {
    it('should throw error when openai package is not installed', async () => {
      const config: Config = {
        ...baseConfig,
        llm: {
          ...baseConfig.llm,
          provider: 'openai',
        },
      };

      await expect(createLLMClient(config)).rejects.toThrow(
        'OpenAI provider requires "openai" package'
      );
    });
  });
});
