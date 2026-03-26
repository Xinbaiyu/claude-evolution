/**
 * OpenAI Provider
 * 适配 OpenAI SDK 到统一的 LLMProvider 接口
 */

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
  private readonly client: any;

  constructor(config: OpenAIProviderConfig) {
    // 动态导入 OpenAI SDK（如果已安装）
    try {
      // eslint-disable-next-line @typescript-eslint/no-var-requires
      const OpenAI = require('openai');
      this.client = new OpenAI({
        apiKey: config.apiKey || process.env.OPENAI_API_KEY,
        ...(config.baseURL && { baseURL: config.baseURL }),
        ...(config.organization && { organization: config.organization }),
      });
    } catch (error) {
      throw new Error(
        'OpenAI provider requires "openai" package. Install it with: npm install openai'
      );
    }
  }

  async createCompletion(params: LLMCompletionParams): Promise<LLMCompletionResponse> {
    const { model, messages, maxTokens, temperature, systemPrompt } = params;

    // Convert LLMMessage to OpenAI message format
    const apiMessages: Array<{ role: 'system' | 'user' | 'assistant'; content: string }> = [];

    // Inject systemPrompt as first message if provided
    if (systemPrompt) {
      apiMessages.push({ role: 'system', content: systemPrompt });
    }

    // Add user and assistant messages
    for (const msg of messages) {
      if (msg.role === 'system') {
        // System messages should be at the beginning
        // If systemPrompt wasn't provided, add it here
        if (!systemPrompt) {
          apiMessages.unshift({ role: 'system', content: msg.content });
        }
      } else {
        apiMessages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content,
        });
      }
    }

    // Call OpenAI API
    const response = await this.client.chat.completions.create({
      model,
      messages: apiMessages,
      ...(maxTokens && { max_tokens: maxTokens }),
      ...(temperature !== undefined && { temperature }),
    });

    // Extract content from response
    const content = response.choices[0]?.message?.content ?? '';

    // Convert usage format
    return {
      content,
      usage: {
        inputTokens: response.usage?.prompt_tokens ?? 0,
        outputTokens: response.usage?.completion_tokens ?? 0,
      },
    };
  }
}
