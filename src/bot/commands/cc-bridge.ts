/**
 * Claude Code Bridge — 钉钉消息桥接 Claude Code CLI
 * 替代原 ChatCommand 作为 fallback handler
 */

import type { CommandHandler, CommandContext, BotReply, BotMessage } from '../types.js';
import { ChatContextManager } from '../chat-context.js';
import { executeCC } from '../cc-executor.js';
import { resolveWorkingDir, isPathAllowed } from '../path-resolver.js';
import { sendAsyncReply } from '../async-reply.js';
import { loadConfig } from '../../config/index.js';

export class CCBridgeHandler implements CommandHandler {
  readonly name = 'cc-bridge';
  readonly aliases: string[] = [];
  readonly description = 'Claude Code 执行（发送任意内容触发）';

  private readonly contextManager: ChatContextManager;

  constructor(contextManager: ChatContextManager) {
    this.contextManager = contextManager;
  }

  /** 仅作为 fallback，不主动匹配 */
  match(): boolean {
    return false;
  }

  async execute(ctx: CommandContext): Promise<BotReply> {
    const { message } = ctx;

    // 记录用户消息到上下文
    this.contextManager.addMessage(message.chatId, 'user', message.content);

    // 后台异步执行 CC
    this.executeCCAndReply(message).catch((error) => {
      console.error('[CC Bridge] 执行失败:', error);
      if (message.sessionWebhook) {
        sendAsyncReply(message.sessionWebhook, {
          content: `CC 执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
          format: 'text',
        }).catch(() => { /* 静默 */ });
      }
    });

    return { content: '正在处理... (Claude Code 执行中)', format: 'text', async: true };
  }

  private async executeCCAndReply(message: BotMessage): Promise<void> {
    const config = await loadConfig();
    const ccConfig = config.bot?.cc;

    if (!ccConfig?.enabled) {
      if (message.sessionWebhook) {
        await sendAsyncReply(message.sessionWebhook, {
          content: 'Claude Code 桥接未启用，请在配置中开启 bot.cc.enabled',
          format: 'text',
        });
      }
      return;
    }

    const defaultCwd = ccConfig.defaultCwd || '~';
    const allowedDirs = ccConfig.allowedDirs || [];

    // 解析工作目录
    const { cwd, prompt } = resolveWorkingDir(message.content, defaultCwd);

    // 白名单验证
    if (!isPathAllowed(cwd, allowedDirs)) {
      if (message.sessionWebhook) {
        await sendAsyncReply(message.sessionWebhook, {
          content: `目录 ${cwd} 不在允许列表中。\n允许的目录: ${allowedDirs.join(', ')}`,
          format: 'text',
        });
      }
      return;
    }

    // 构建上下文
    const history = this.contextManager.getHistory(message.chatId);
    // 排除最后一条（就是当前消息，已经作为 prompt 了）
    const contextMessages = history.slice(0, -1);
    const systemPrompt = contextMessages.length > 0
      ? `以下是之前的对话上下文:\n${contextMessages.map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`).join('\n')}\n\n请基于以上上下文回复用户的最新消息。`
      : undefined;

    // 执行 CC
    const result = await executeCC({
      prompt,
      cwd,
      timeoutMs: ccConfig.timeoutMs || 120_000,
      maxBudgetUsd: ccConfig.maxBudgetUsd || 0.5,
      systemPrompt,
      permissionMode: ccConfig.permissionMode || 'bypassPermissions',
      baseURL: ccConfig.baseURL,
    });

    const replyText = result.success
      ? result.result || '(无输出)'
      : `执行失败: ${result.error}`;

    // 记录回复到上下文
    this.contextManager.addMessage(message.chatId, 'assistant', replyText);

    // 推送结果
    if (message.sessionWebhook) {
      const costInfo = result.costUsd
        ? `\n\n---\n_耗时 ${(result.durationMs / 1000).toFixed(1)}s | 费用 $${result.costUsd.toFixed(4)}_`
        : `\n\n---\n_耗时 ${(result.durationMs / 1000).toFixed(1)}s_`;

      await sendAsyncReply(message.sessionWebhook, {
        content: replyText + costInfo,
        format: 'markdown',
      });
    }
  }
}
