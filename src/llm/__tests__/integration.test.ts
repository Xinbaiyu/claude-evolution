/**
 * Integration Tests for LLM Client Factory
 *
 * NOTE: These tests verify configuration handling and client creation,
 * but do not make actual API calls. For full end-to-end testing:
 * - Task 11.1: Manually test with CCR baseURL
 * - Task 11.2: Manually test with ANTHROPIC_API_KEY
 * - Task 11.3: Test chat, experience-extractor, llm-merge, context-merge
 */

import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { createLLMClient } from '../client-factory.js';
import { AnthropicProvider } from '../providers/anthropic.js';
import type { Config } from '../../config/schema.js';

describe('LLM Client Factory Integration', () => {
  const originalEnv = process.env;

  beforeEach(() => {
    // Reset environment before each test
    process.env = { ...originalEnv };
    delete process.env.ANTHROPIC_API_KEY;
    delete process.env.OPENAI_API_KEY;
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  describe('CCR Mode (baseURL)', () => {
    it('should create Anthropic client with baseURL for CCR proxy', async () => {
      const config: Config = {
        llm: {
          model: 'claude-3-5-haiku-20241022',
          baseURL: 'http://localhost:3456',
          maxTokens: 4096,
        },
        learning: {
          enabled: false,
          sessionIntervalMs: 0,
          decay: { halfLifeDays: 30 },
          deletion: { minConfidence: 0.3, minAge: 60, lowConfidenceAge: 30 },
          capacity: { active: { minSize: 50, targetSize: 100, maxSize: 200 } },
          promotion: { minMentions: 3, minConfidence: 0.8, goldThreshold: 0.95 },
          retention: { archivedDays: 365 },
        },
      };

      const client = await createLLMClient(config);

      expect(client).toBeInstanceOf(AnthropicProvider);
      expect(client.providerName).toBe('anthropic');

      // Verify client has access to underlying Anthropic SDK client
      const anthropicClient = (client as AnthropicProvider).getClient();
      expect(anthropicClient).toBeDefined();
    });

    it('should work with CCR proxy without API key', async () => {
      const config: Config = {
        llm: {
          model: 'claude-3-5-haiku-20241022',
          baseURL: 'http://localhost:3456',
          maxTokens: 4096,
        },
        learning: {
          enabled: false,
          sessionIntervalMs: 0,
          decay: { halfLifeDays: 30 },
          deletion: { minConfidence: 0.3, minAge: 60, lowConfidenceAge: 30 },
          capacity: { active: { minSize: 50, targetSize: 100, maxSize: 200 } },
          promotion: { minMentions: 3, minConfidence: 0.8, goldThreshold: 0.95 },
          retention: { archivedDays: 365 },
        },
      };

      // Should not throw even without ANTHROPIC_API_KEY (uses dummy key)
      const client = await createLLMClient(config);
      expect(client).toBeInstanceOf(AnthropicProvider);
    });
  });

  describe('API Key Mode', () => {
    it('should create Anthropic client with ANTHROPIC_API_KEY env var', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-test-key';

      const config: Config = {
        llm: {
          model: 'claude-3-5-haiku-20241022',
          maxTokens: 4096,
        },
        learning: {
          enabled: false,
          sessionIntervalMs: 0,
          decay: { halfLifeDays: 30 },
          deletion: { minConfidence: 0.3, minAge: 60, lowConfidenceAge: 30 },
          capacity: { active: { minSize: 50, targetSize: 100, maxSize: 200 } },
          promotion: { minMentions: 3, minConfidence: 0.8, goldThreshold: 0.95 },
          retention: { archivedDays: 365 },
        },
      };

      const client = await createLLMClient(config);

      expect(client).toBeInstanceOf(AnthropicProvider);
      expect(client.providerName).toBe('anthropic');
    });

    it('should use explicit apiKey config over environment variable', async () => {
      process.env.ANTHROPIC_API_KEY = 'sk-ant-env-key';

      const config: Config = {
        llm: {
          model: 'claude-3-5-haiku-20241022',
          apiKey: 'sk-ant-config-key',
          maxTokens: 4096,
        },
        learning: {
          enabled: false,
          sessionIntervalMs: 0,
          decay: { halfLifeDays: 30 },
          deletion: { minConfidence: 0.3, minAge: 60, lowConfidenceAge: 30 },
          capacity: { active: { minSize: 50, targetSize: 100, maxSize: 200 } },
          promotion: { minMentions: 3, minConfidence: 0.8, goldThreshold: 0.95 },
          retention: { archivedDays: 365 },
        },
      };

      const client = await createLLMClient(config);
      expect(client).toBeInstanceOf(AnthropicProvider);
    });
  });

  describe('Explicit Provider Selection', () => {
    it('should use explicit provider config over auto-detection', async () => {
      process.env.OPENAI_API_KEY = 'sk-test-openai-key';

      const config: Config = {
        llm: {
          provider: 'anthropic',
          model: 'claude-3-5-haiku-20241022',
          apiKey: 'sk-ant-explicit',
          maxTokens: 4096,
        },
        learning: {
          enabled: false,
          sessionIntervalMs: 0,
          decay: { halfLifeDays: 30 },
          deletion: { minConfidence: 0.3, minAge: 60, lowConfidenceAge: 30 },
          capacity: { active: { minSize: 50, targetSize: 100, maxSize: 200 } },
          promotion: { minMentions: 3, minConfidence: 0.8, goldThreshold: 0.95 },
          retention: { archivedDays: 365 },
        },
      };

      const client = await createLLMClient(config);

      // Should use Anthropic despite OPENAI_API_KEY being set
      expect(client).toBeInstanceOf(AnthropicProvider);
      expect(client.providerName).toBe('anthropic');
    });
  });

  describe('Error Handling', () => {
    it('should throw clear error when no provider can be determined', async () => {
      const config: Config = {
        llm: {
          model: 'claude-3-5-haiku-20241022',
          maxTokens: 4096,
        },
        learning: {
          enabled: false,
          sessionIntervalMs: 0,
          decay: { halfLifeDays: 30 },
          deletion: { minConfidence: 0.3, minAge: 60, lowConfidenceAge: 30 },
          capacity: { active: { minSize: 50, targetSize: 100, maxSize: 200 } },
          promotion: { minMentions: 3, minConfidence: 0.8, goldThreshold: 0.95 },
          retention: { archivedDays: 365 },
        },
      };

      await expect(createLLMClient(config)).rejects.toThrow(
        'Cannot determine LLM provider'
      );
    });

    it('should throw clear error for invalid provider', async () => {
      const config: Config = {
        llm: {
          provider: 'invalid-provider' as any,
          model: 'claude-3-5-haiku-20241022',
          maxTokens: 4096,
        },
        learning: {
          enabled: false,
          sessionIntervalMs: 0,
          decay: { halfLifeDays: 30 },
          deletion: { minConfidence: 0.3, minAge: 60, lowConfidenceAge: 30 },
          capacity: { active: { minSize: 50, targetSize: 100, maxSize: 200 } },
          promotion: { minMentions: 3, minConfidence: 0.8, goldThreshold: 0.95 },
          retention: { archivedDays: 365 },
        },
      };

      await expect(createLLMClient(config)).rejects.toThrow(
        'Invalid llm.provider'
      );
    });
  });
});
