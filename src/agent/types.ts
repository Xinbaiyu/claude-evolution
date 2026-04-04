/**
 * Agent 执行相关类型定义
 */

/**
 * Agent 执行选项
 */
export interface AgentExecuteOptions {
  /** 用户提示词（必需） */
  prompt: string;
  /** 系统提示词（可选） */
  systemPrompt?: string;
  /** 工作目录（可选，默认使用 config.agent.defaultCwd） */
  cwd?: string;
}

/**
 * Agent 执行结果
 */
export interface AgentExecuteResult {
  /** 是否执行成功 */
  success: boolean;
  /** 执行结果（成功时） */
  result?: string;
  /** 错误信息（失败时） */
  error?: string;
  /** 执行耗时（毫秒） */
  durationMs: number;
  /** 消耗成本（美元） */
  costUsd?: number;
}
