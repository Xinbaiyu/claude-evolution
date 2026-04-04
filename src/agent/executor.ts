/**
 * AgentExecutor - 统一的 Agent 执行抽象层
 * 封装配置读取、参数验证、Claude Code CLI 调用等逻辑
 */

import type { Config } from '../config/schema.js';
import { loadConfig } from '../config/loader.js';
import { executeCC } from '../bot/cc-executor.js';
import { isPathAllowed } from '../bot/path-resolver.js';
import type { AgentExecuteOptions, AgentExecuteResult } from './types.js';

/**
 * Agent 执行器
 * 提供统一的 Agent 执行接口，自动从 config.agent 读取配置
 */
export class AgentExecutor {
  private config: Config;

  constructor(config: Config) {
    this.config = config;

    // 验证 config.agent 存在
    if (!config.agent) {
      throw new Error('Agent config not found in configuration');
    }
  }

  /**
   * 执行 Agent 任务
   * @param options 执行选项（只需提供 prompt，其他参数从配置读取）
   * @returns 执行结果（不抛出异常，错误通过 result.error 返回）
   */
  async execute(options: AgentExecuteOptions): Promise<AgentExecuteResult> {
    const startTime = Date.now();

    try {
      // 验证配置
      if (!this.config.agent) {
        return {
          success: false,
          error: 'Agent config not found',
          durationMs: 0,
        };
      }

      const agentConfig = this.config.agent;
      const cwd = options.cwd || agentConfig.defaultCwd;

      // 白名单验证
      if (!isPathAllowed(cwd, agentConfig.allowedDirs)) {
        return {
          success: false,
          error: `Path not allowed: ${cwd}. Allowed directories: ${agentConfig.allowedDirs.join(', ')}`,
          durationMs: Date.now() - startTime,
        };
      }

      // 调用 executeCC
      const result = await executeCC({
        prompt: options.prompt,
        cwd,
        timeoutMs: agentConfig.timeoutMs,
        maxBudgetUsd: agentConfig.maxBudgetUsd,
        systemPrompt: options.systemPrompt,
        permissionMode: agentConfig.permissionMode,
        baseURL: agentConfig.baseURL,
      });

      return result;
    } catch (error) {
      return {
        success: false,
        error: error instanceof Error ? error.message : 'Unknown error',
        durationMs: Date.now() - startTime,
      };
    }
  }

  /**
   * 热更新配置（重新加载配置文件）
   */
  async reloadConfig(): Promise<void> {
    this.config = await loadConfig();
  }
}

/**
 * 全局单例实例
 */
let globalExecutor: AgentExecutor | null = null;

/**
 * 获取 AgentExecutor 单例
 * 首次调用时创建实例，后续调用返回缓存的实例
 */
export async function getAgentExecutor(): Promise<AgentExecutor> {
  if (!globalExecutor) {
    const config = await loadConfig();
    globalExecutor = new AgentExecutor(config);
  }
  return globalExecutor;
}
