/**
 * Bot 命令路由器 — 前缀匹配 + 别名 + 动态模式 fallback
 */

import type { CommandHandler, CommandContext, BotMessage, BotReply } from './types.js';
import type { UserModePreferenceManager } from './user-mode-manager.js';
import { logToFile } from './file-logger.js';

export class BotCommandRouter {
  private readonly handlers: CommandHandler[] = [];
  private agentHandler: CommandHandler | null = null;
  private chatHandler: CommandHandler | null = null;
  private readonly modeManager: UserModePreferenceManager;

  constructor(modeManager: UserModePreferenceManager) {
    this.modeManager = modeManager;
  }

  register(handler: CommandHandler): void {
    this.handlers.push(handler);
  }

  /** 设置 Agent 和 Chat 模式的 fallback handlers */
  setModeHandlers(agent: CommandHandler | null, chat: CommandHandler | null): void {
    this.agentHandler = agent;
    this.chatHandler = chat;
  }

  /** 根据消息内容匹配并执行命令 */
  async dispatch(ctx: CommandContext): Promise<BotReply> {
    const { content } = ctx.message;

    // 1. 尝试匹配注册的命令
    for (const handler of this.handlers) {
      if (handler.match(content)) {
        try {
          logToFile('[Router] 匹配命令:', handler.name);
          return await handler.execute(ctx);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          logToFile('[Router] 命令执行失败:', handler.name, errorMsg);
          return {
            content: `命令执行失败: ${errorMsg}`,
            format: 'text',
          };
        }
      }
    }

    // 2. 根据用户模式选择 fallback handler
    const mode = this.modeManager.getMode(ctx.message.chatId);
    const fallback = mode === 'agent' ? this.agentHandler : this.chatHandler;

    logToFile('[Router] 使用 fallback handler:', mode, fallback ? '已配置' : '未配置');

    if (fallback) {
      try {
        return await fallback.execute(ctx);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        logToFile('[Router] Fallback 处理失败:', mode, errorMsg);
        return {
          content: `处理失败: ${errorMsg}`,
          format: 'text',
        };
      }
    }

    // 3. 无可用 handler
    return {
      content: '当前无可用模式，请使用 /agent 或 /chat 切换模式\n\n或查看可用命令：\n' + this.getHelpText(),
      format: 'text',
    };
  }

  getHelpText(): string {
    return this.handlers
      .map((h) => `- ${h.name}: ${h.description}`)
      .join('\n');
  }
}

/** 创建简单的前缀匹配函数 */
export function prefixMatcher(name: string, aliases: string[]): (content: string) => boolean {
  const patterns = [name, ...aliases].map((p) => p.toLowerCase());
  return (content: string) => {
    const lower = content.toLowerCase().trim();
    return patterns.some((p) => lower === p || lower.startsWith(p + ' '));
  };
}

/** 提取命令参数（去除命令前缀后的文本） */
export function extractArgs(content: string, name: string, aliases: string[]): string {
  const lower = content.toLowerCase().trim();
  const patterns = [name, ...aliases].map((p) => p.toLowerCase());

  for (const p of patterns) {
    if (lower === p) return '';
    if (lower.startsWith(p + ' ')) {
      return content.trim().slice(p.length).trim();
    }
  }
  return content.trim();
}
