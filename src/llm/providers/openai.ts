/**
 * OpenAI Provider
 * 适配 OpenAI SDK 到统一的 LLMProvider 接口
 */

import { OpenAI } from 'openai';
import type {
  LLMProvider,
  LLMCompletionParams,
  LLMCompletionResponse,
} from '../types.js';

/** OpenAI Provider 配置 */
export interface OpenAIProviderConfig {
  /** API Key */
  apiKey?: string;
  /** 自定义 API 端点 */
  baseURL?: string;
  /** Organization ID */
  organization?: string;
}

/**
 * OpenAI LLM 提供商
 * 需要安装 openai npm 包
 */
export class OpenAIProvider implements LLMProvider {
  readonly providerName = 'openai';
  private readonly client: OpenAI;

  private constructor(config: OpenAIProviderConfig) {
    // API Key 优先级：config.apiKey > 环境变量 OPENAI_API_KEY
    const apiKey = config.apiKey || process.env.OPENAI_API_KEY;
    if (!apiKey) {
      throw new Error(
        'OpenAI API Key not configured. Set it in UI (Settings → LLM Provider) or environment variable OPENAI_API_KEY.'
      );
    }

    // 直接使用 OpenAI 类
    this.client = new OpenAI({
      apiKey,
      ...(config.baseURL && { baseURL: config.baseURL }),
      ...(config.organization && { organization: config.organization }),
    });
  }

  /**
   * 静态工厂方法 - 创建 OpenAI Provider 实例
   */
  static async create(config: OpenAIProviderConfig): Promise<OpenAIProvider> {
    return new OpenAIProvider(config);
  }

  async createCompletion(params: LLMCompletionParams): Promise<LLMCompletionResponse> {
    const { model, messages, maxTokens, temperature, systemPrompt } = params;

    // Build OpenAI message array - system prompt first, then conversation messages
    const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [
      // System prompt from params (if provided)
      ...(systemPrompt ? [{ role: 'system' as const, content: systemPrompt }] : []),
      // Convert conversation messages (filter out system messages to avoid duplicates)
      ...messages
        .filter((msg) => msg.role !== 'system')
        .map((msg) => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        })),
    ];

    try {
      // Call OpenAI API
      const response = await this.client.chat.completions.create({
        model,
        messages: apiMessages,
        ...(maxTokens && { max_tokens: maxTokens }),
        ...(temperature !== undefined && { temperature }),
      });

      // Extract content from response
      const content = response.choices[0]?.message?.content ?? '';

      // Convert usage format to unified interface
      return {
        content,
        usage: {
          inputTokens: response.usage?.prompt_tokens ?? 0,
          outputTokens: response.usage?.completion_tokens ?? 0,
        },
      };
    } catch (error) {
      // Enhance error message with provider context
      throw new Error(
        `OpenAI API error: ${error instanceof Error ? error.message : 'Unknown error'}`
      );
    }
  }
}
