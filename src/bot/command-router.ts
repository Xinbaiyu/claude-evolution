/**
 * Bot 命令路由器 — 前缀匹配 + 别名 + LLM fallback
 */

import type { CommandHandler, CommandContext, BotMessage, BotReply } from './types.js';

export class BotCommandRouter {
  private readonly handlers: CommandHandler[] = [];
  private fallback: CommandHandler | null = null;

  register(handler: CommandHandler): void {
    this.handlers.push(handler);
  }

  /** 设置无匹配时的 fallback handler（LLM 对话） */
  setFallback(handler: CommandHandler): void {
    this.fallback = handler;
  }

  /** 根据消息内容匹配并执行命令 */
  async dispatch(ctx: CommandContext): Promise<BotReply> {
    const { content } = ctx.message;

    for (const handler of this.handlers) {
      if (handler.match(content)) {
        try {
          return await handler.execute(ctx);
        } catch (error) {
          const errorMsg = error instanceof Error ? error.message : String(error);
          return {
            content: `命令执行失败: ${errorMsg}`,
            format: 'text',
          };
        }
      }
    }

    // LLM fallback
    if (this.fallback) {
      try {
        return await this.fallback.execute(ctx);
      } catch (error) {
        const errorMsg = error instanceof Error ? error.message : String(error);
        return {
          content: `处理失败: ${errorMsg}`,
          format: 'text',
        };
      }
    }

    return {
      content: '我能帮你做这些事：\n' + this.getHelpText(),
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
