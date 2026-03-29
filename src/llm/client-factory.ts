/**
 * LLM 客户端工厂
 * 根据配置自动创建合适的 LLM 提供商实例
 */

import type { Config } from '../config/index.js';
import type { LLMProvider, LLMProviderType } from './types.js';
import { AnthropicProvider } from './providers/anthropic.js';

/** 缓存的提供商实例（单例模式） */
const providerCache = new Map<string, LLMProvider>();

/**
 * 生成缓存 key
 * @param config 配置
 * @returns 缓存 key
 */
function getCacheKey(config: Config): string {
  const { activeProvider, claude, openai, ccr } = config.llm;

  switch (activeProvider) {
    case 'claude':
      return `claude:${claude.model}:${claude.enablePromptCaching}`;
    case 'openai':
      return `openai:${openai.baseURL || ''}:${openai.model}`;
    case 'ccr':
      return `ccr:${ccr.baseURL}:${ccr.model}`;
    default:
      return `unknown:${activeProvider}`;
  }
}

/**
 * 验证提供商配置是否存在
 * @param config 系统配置
 */
function validateProviderConfig(config: Config): void {
  const { activeProvider, claude, openai, ccr } = config.llm;

  if (!activeProvider) {
    throw new Error('config.llm.activeProvider is required');
  }

  switch (activeProvider) {
    case 'claude':
      if (!claude) {
        throw new Error('config.llm.claude configuration is missing');
      }
      break;
    case 'openai':
      if (!openai) {
        throw new Error('config.llm.openai configuration is missing');
      }
      break;
    case 'ccr':
      if (!ccr) {
        throw new Error('config.llm.ccr configuration is missing');
      }
      if (!ccr.baseURL) {
        throw new Error('config.llm.ccr.baseURL is required for CCR provider');
      }
      break;
    default:
      throw new Error(`Invalid activeProvider: "${activeProvider}". Must be "claude", "openai", or "ccr"`);
  }
}

/**
 * 创建 Claude 提供商（官方 API）
 * @param config 系统配置
 * @returns Claude 提供商实例
 */
function createClaudeProvider(config: Config): LLMProvider {
  const claudeConfig = config.llm.claude;

  return new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: undefined, // Claude 官方 API 不使用自定义 baseURL
    enablePromptCaching: claudeConfig.enablePromptCaching,
  });
}

/**
 * 创建 OpenAI 提供商
 * @param config 系统配置
 * @returns OpenAI 提供商实例
 */
async function createOpenAIProvider(config: Config): Promise<LLMProvider> {
  const { OpenAIProvider } = await import('./providers/openai.js');
  const openaiConfig = config.llm.openai;

  return await OpenAIProvider.create({
    apiKey: openaiConfig.apiKey,
    baseURL: openaiConfig.baseURL,
    organization: openaiConfig.organization,
  });
}

/**
 * 创建 CCR 提供商（CCR Proxy）
 *
 * CCR (Claude Code Router) 本质是 Anthropic Messages API 的代理服务，
 * 因此复用 AnthropicProvider 实现，仅通过 baseURL 指向 CCR 代理地址。
 *
 * @param config 系统配置
 * @returns CCR 提供商实例（底层使用 AnthropicProvider）
 */
function createCCRProvider(config: Config): LLMProvider {
  const ccrConfig = config.llm.ccr;

  // CCR 使用 Anthropic API 格式，通过 baseURL 路由到 CCR 代理
  return new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY || 'dummy-key-for-ccr-proxy',
    baseURL: ccrConfig.baseURL,
    // CCR 是否支持 prompt caching 取决于上游 Anthropic API
    // 默认禁用，如果 CCR 透传则可以启用
    enablePromptCaching: false,
  });
}

/**
 * 创建 LLM 客户端
 * @param config 系统配置
 * @returns LLM 提供商实例
 */
export async function createLLMClient(config: Config): Promise<LLMProvider> {
  // 验证配置有效性
  validateProviderConfig(config);

  const { activeProvider } = config.llm;

  // 生成缓存 key
  const cacheKey = getCacheKey(config);

  // 检查缓存
  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  // 根据 activeProvider 创建对应的提供商实例
  let provider: LLMProvider;

  switch (activeProvider) {
    case 'claude':
      provider = createClaudeProvider(config);
      break;

    case 'openai':
      provider = await createOpenAIProvider(config);
      break;

    case 'ccr':
      provider = createCCRProvider(config);
      break;

    default:
      throw new Error(`Unsupported activeProvider: ${activeProvider}`);
  }

  // 缓存实例
  providerCache.set(cacheKey, provider);

  return provider;
}
