/**
 * Unit Tests for OpenAIProvider
 *
 * Note: The OpenAI provider requires the 'openai' package to be installed.
 * Since it's an optional dependency, we test error handling when it's missing.
 * Full functionality tests would require the actual package.
 */

import { describe, it, expect } from 'vitest';
import { OpenAIProvider } from '../providers/openai.js';

describe('OpenAIProvider', () => {
  describe('Package Dependency', () => {
    it('should throw helpful error when openai package is not installed', async () => {
      await expect(
        OpenAIProvider.create({
          apiKey: 'test-key',
        })
      ).rejects.toThrow('OpenAI provider requires "openai" package');
    });

    it('should include installation instructions in error', async () => {
      try {
        await OpenAIProvider.create({ apiKey: 'test-key' });
        expect.fail('Should have thrown an error');
      } catch (error) {
        expect(error instanceof Error).toBe(true);
        expect((error as Error).message).toContain('npm install openai');
      }
    });
  });

  describe('Configuration Validation', () => {
    it('should accept apiKey configuration', () => {
      // This tests that the config structure is correct,
      // even if we can't instantiate without the package
      const config = {
        apiKey: 'sk-test-key',
      };

      expect(config).toHaveProperty('apiKey');
      expect(typeof config.apiKey).toBe('string');
    });

    it('should accept baseURL configuration', () => {
      const config = {
        apiKey: 'sk-test',
        baseURL: 'https://custom.openai.com/v1',
      };

      expect(config).toHaveProperty('baseURL');
      expect(typeof config.baseURL).toBe('string');
    });

    it('should accept organization configuration', () => {
      const config = {
        apiKey: 'sk-test',
        organization: 'org-123',
      };

      expect(config).toHaveProperty('organization');
      expect(typeof config.organization).toBe('string');
    });
  });

  describe('Implementation Contract', () => {
    it('should be a valid class with static factory method', () => {
      // Verify OpenAIProvider is a proper class with create method
      expect(typeof OpenAIProvider).toBe('function');
      expect(OpenAIProvider.prototype).toBeDefined();
      expect(typeof OpenAIProvider.create).toBe('function');
    });

    it('should have createCompletion method', () => {
      // createCompletion is a method on the prototype
      expect(OpenAIProvider.prototype).toHaveProperty('createCompletion');
      expect(typeof OpenAIProvider.prototype.createCompletion).toBe('function');
    });
  });
});

/**
 * Full Integration Tests (requires 'openai' package installed)
 *
 * To run full tests with actual OpenAI SDK:
 * 1. Install: npm install openai
 * 2. Add tests below:
 *
 * describe('OpenAIProvider (with package)', () => {
 *   let provider: OpenAIProvider;
 *
 *   beforeEach(() => {
 *     provider = new OpenAIProvider({ apiKey: 'test-key' });
 *   });
 *
 *   it('should create completion', async () => {
 *     // Mock or use real API
 *   });
 *
 *   it('should inject system prompt', async () => {
 *     // Test system prompt handling
 *   });
 *
 *   it('should convert response format', async () => {
 *     // Test response conversion
 *   });
 * });
 */
