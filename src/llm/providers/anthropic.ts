/**
 * Anthropic Provider
 * 适配 Anthropic SDK 到统一的 LLMProvider 接口
 */

import Anthropic from '@anthropic-ai/sdk';
import type {
  LLMProvider,
  LLMCompletionParams,
  LLMCompletionResponse,
} from '../types.js';

/** Anthropic Provider 配置 */
export interface AnthropicProviderConfig {
  /** API Key（CCR 模式可为空） */
  apiKey?: string;
  /** 自定义 API 端点（CCR 代理地址） */
  baseURL?: string;
  /** 自定义请求头 */
  defaultHeaders?: Record<string, string>;
  /** 是否启用 Prompt Caching */
  enablePromptCaching?: boolean;
}

/**
 * Anthropic LLM 提供商
 * 支持 CCR 模式和官方 API 模式
 */
export class AnthropicProvider implements LLMProvider {
  readonly providerName = 'anthropic';
  private readonly client: Anthropic;
  private readonly enablePromptCaching: boolean;

  /**
   * 获取底层 Anthropic 客户端
   * 用于访问 Anthropic 特有功能（如 prompt caching）
   */
  getClient(): Anthropic {
    return this.client;
  }

  constructor(config: AnthropicProviderConfig) {
    const { apiKey, baseURL, defaultHeaders, enablePromptCaching = false } = config;

    // CCR 模式：使用 dummy key + baseURL
    // API 模式：使用真实 API key
    this.client = new Anthropic({
      apiKey: apiKey || 'dummy-key-for-local-proxy',
      ...(baseURL && { baseURL }),
      ...(defaultHeaders && { defaultHeaders }),
    });

    this.enablePromptCaching = enablePromptCaching;
  }

  async createCompletion(params: LLMCompletionParams): Promise<LLMCompletionResponse> {
    const { model, messages, maxTokens = 4096, temperature, systemPrompt } = params;

    // Filter out system messages (Anthropic SDK requires system via separate parameter)
    const userAssistantMessages = messages.filter(
      (m) => m.role === 'user' || m.role === 'assistant'
    ) as Array<{ role: 'user' | 'assistant'; content: string }>;

    // 调用 Anthropic SDK
    const response = await this.client.messages.create({
      model,
      max_tokens: maxTokens,
      messages: userAssistantMessages,
      ...(temperature !== undefined && { temperature }),
      ...(systemPrompt && { system: systemPrompt }),
    });

    // 提取第一个文本块
    const textBlock = response.content.find((block) => block.type === 'text');
    const content = textBlock && textBlock.type === 'text' ? textBlock.text : '';

    // 转换响应格式
    return {
      content,
      usage: {
        inputTokens: response.usage.input_tokens,
        outputTokens: response.usage.output_tokens,
      },
    };
  }
}
