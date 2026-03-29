/**
 * LLM Provider 统一接口
 * 支持多种 LLM 提供商（Anthropic、OpenAI 等）
 */

/** LLM 消息角色 */
export type LLMMessageRole = 'user' | 'assistant' | 'system';

/** LLM 消息 */
export interface LLMMessage {
  role: LLMMessageRole;
  content: string;
}

/** LLM 完成请求参数 */
export interface LLMCompletionParams {
  /** 模型名称（如 claude-3-5-sonnet、gpt-4） */
  model: string;
  /** 消息历史 */
  messages: LLMMessage[];
  /** 最大 token 数 */
  maxTokens?: number;
  /** 温度参数（0-1） */
  temperature?: number;
  /** 系统提示词（可选，某些 provider 通过 messages[0] 实现） */
  systemPrompt?: string;
}

/** LLM 完成响应 */
export interface LLMCompletionResponse {
  /** 生成的文本内容 */
  content: string;
  /** 使用统计（可选） */
  usage?: {
    /** 输入 token 数 */
    inputTokens: number;
    /** 输出 token 数 */
    outputTokens: number;
  };
}

/** LLM 提供商接口 */
export interface LLMProvider {
  /** 提供商名称（如 "anthropic"、"openai"） */
  readonly providerName: string;

  /**
   * 创建 LLM 完成
   * @param params 请求参数
   * @returns 完成响应
   */
  createCompletion(params: LLMCompletionParams): Promise<LLMCompletionResponse>;

  /**
   * 执行 experience extraction
   * @param prompt 用户提示词
   * @param systemMessage 系统消息
   * @param options 调用选项（model, maxTokens, temperature）
   * @returns LLM 响应的 JSON 文本
   */
  extractExperience(
    prompt: string,
    systemMessage: string,
    options: {
      model: string;
      maxTokens: number;
      temperature: number;
    }
  ): Promise<string>;

  /**
   * 是否支持 prompt caching
   * @returns true 表示支持，false 表示不支持
   */
  supportsPromptCaching(): boolean;
}

/** 支持的 LLM 提供商类型 */
export type LLMProviderType = 'anthropic' | 'openai';
