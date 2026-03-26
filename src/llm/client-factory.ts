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
 * @param provider 提供商类型
 * @param config 配置
 * @returns 缓存 key
 */
function getCacheKey(provider: LLMProviderType, config: Config): string {
  const llmConfig = config.llm;
  return `${provider}:${llmConfig.baseURL || ''}:${llmConfig.model}`;
}

/**
 * 检测 LLM 提供商类型
 * @param config 系统配置
 * @returns 提供商类型
 */
function detectProvider(config: Config): LLMProviderType {
  const llmConfig = config.llm;

  // 1. 显式指定 provider
  if ('provider' in llmConfig && llmConfig.provider) {
    const provider = llmConfig.provider as string;
    if (provider !== 'anthropic' && provider !== 'openai') {
      throw new Error(
        `Invalid llm.provider: "${provider}". Supported providers: "anthropic", "openai"`
      );
    }
    return provider as LLMProviderType;
  }

  // 2. 根据 baseURL 推断（CCR 模式）
  if (llmConfig.baseURL) {
    return 'anthropic';
  }

  // 3. 根据环境变量推断
  if (process.env.ANTHROPIC_API_KEY) {
    return 'anthropic';
  }

  if (process.env.OPENAI_API_KEY) {
    return 'openai';
  }

  // 4. 无法推断，抛出错误
  throw new Error(
    'Cannot determine LLM provider. Please configure one of:\n' +
      '  - Set llm.provider in config (e.g., "anthropic" or "openai")\n' +
      '  - Set llm.baseURL for CCR proxy mode\n' +
      '  - Set ANTHROPIC_API_KEY environment variable\n' +
      '  - Set OPENAI_API_KEY environment variable'
  );
}

/**
 * 创建 Anthropic 提供商
 * @param config 系统配置
 * @returns Anthropic 提供商实例
 */
function createAnthropicProvider(config: Config): LLMProvider {
  const llmConfig = config.llm;

  return new AnthropicProvider({
    apiKey: process.env.ANTHROPIC_API_KEY,
    baseURL: llmConfig.baseURL,
    defaultHeaders: llmConfig.defaultHeaders,
    enablePromptCaching: llmConfig.enablePromptCaching,
  });
}

/**
 * 创建 OpenAI 提供商（延迟加载）
 * @param config 系统配置
 * @returns OpenAI 提供商实例
 */
async function createOpenAIProvider(config: Config): Promise<LLMProvider> {
  try {
    const { OpenAIProvider } = await import('./providers/openai.js');
    const llmConfig = config.llm;

    return await OpenAIProvider.create({
      apiKey: process.env.OPENAI_API_KEY,
      baseURL: llmConfig.baseURL,
      organization: llmConfig.openai?.organization,
    });
  } catch (error) {
    throw new Error(
      'OpenAI provider requires "openai" package. Install it with:\n' +
        '  npm install openai\n' +
        'Or set llm.provider to "anthropic" to use Anthropic provider.'
    );
  }
}

/**
 * 创建 LLM 客户端
 * @param config 系统配置
 * @returns LLM 提供商实例
 */
export async function createLLMClient(config: Config): Promise<LLMProvider> {
  // 检测提供商类型
  const providerType = detectProvider(config);

  // 生成缓存 key
  const cacheKey = getCacheKey(providerType, config);

  // 检查缓存
  if (providerCache.has(cacheKey)) {
    return providerCache.get(cacheKey)!;
  }

  // 创建新实例
  let provider: LLMProvider;

  switch (providerType) {
    case 'anthropic':
      provider = createAnthropicProvider(config);
      break;

    case 'openai':
      provider = await createOpenAIProvider(config);
      break;

    default:
      throw new Error(`Unsupported provider: ${providerType}`);
  }

  // 缓存实例
  providerCache.set(cacheKey, provider);

  return provider;
}
