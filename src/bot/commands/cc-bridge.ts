/**
 * Claude Code Bridge — 钉钉消息桥接 Claude Code CLI
 * 替代原 ChatCommand 作为 fallback handler
 */

import type { CommandHandler, CommandContext, BotReply, BotMessage } from '../types.js';
import { ChatContextManager } from '../chat-context.js';
import { resolveWorkingDir } from '../path-resolver.js';
import { sendAsyncReply } from '../async-reply.js';
import { getAgentExecutor } from '../../agent/executor.js';
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
      const errorMsg = error instanceof Error ? error.message : String(error);
      console.error('[CC Bridge] 执行失败:', errorMsg);
      // 使用 logToFile 确保在 daemon 模式下也能看到日志
      if (message.sessionWebhook) {
        sendAsyncReply(message.sessionWebhook, {
          content: `CC 执行失败: ${errorMsg}`,
          format: 'text',
        }).catch((replyError) => {
          console.error('[CC Bridge] 异步回复发送失败:', replyError);
        });
      }
    });

    return { content: '正在处理... (Claude Code 执行中)', format: 'text', async: true };
  }

  private async executeCCAndReply(message: BotMessage): Promise<void> {
    try {
      // 获取 AgentExecutor 单例
      const executor = await getAgentExecutor();

      // 获取配置以读取 defaultCwd
      const config = await loadConfig();
      if (!config.agent) {
        if (message.sessionWebhook) {
          await sendAsyncReply(message.sessionWebhook, {
            content: 'Agent 配置未找到，请在配置中设置 agent 字段',
            format: 'text',
          });
        }
        return;
      }

      const defaultCwd = config.agent.defaultCwd;

      // 解析工作目录
      const { cwd, prompt } = resolveWorkingDir(message.content, defaultCwd);

      // 构建上下文
      const history = this.contextManager.getHistory(message.chatId);
      // 排除最后一条（就是当前消息，已经作为 prompt 了）
      const contextMessages = history.slice(0, -1);
      const systemPrompt = contextMessages.length > 0
        ? `以下是之前的对话上下文:\n${contextMessages.map((m) => `${m.role === 'user' ? '用户' : '助手'}: ${m.content}`).join('\n')}\n\n请基于以上上下文回复用户的最新消息。`
        : undefined;

      // 执行 Agent 任务（白名单验证由 AgentExecutor 内部处理）
      const result = await executor.execute({
        prompt,
        cwd,
        systemPrompt,
      });

      const replyText = result.success
        ? result.result || '(无输出)'
        : `执行失败: ${result.error}`;

      console.log('[CC Bridge] Agent 执行完成:', {
        success: result.success,
        durationMs: result.durationMs,
        resultLength: result.result?.length,
        error: result.error,
      });

      // 记录回复到上下文
      this.contextManager.addMessage(message.chatId, 'assistant', replyText);

      // 推送结果
      if (message.sessionWebhook) {
        const costInfo = result.costUsd
          ? `\n\n---\n_耗时 ${(result.durationMs / 1000).toFixed(1)}s | 费用 $${result.costUsd.toFixed(4)}_`
          : `\n\n---\n_耗时 ${(result.durationMs / 1000).toFixed(1)}s_`;

        console.log('[CC Bridge] 准备发送异步回复，内容长度:', (replyText + costInfo).length);
        await sendAsyncReply(message.sessionWebhook, {
          content: replyText + costInfo,
          format: 'markdown',
        });
        console.log('[CC Bridge] 异步回复已发送');
      }
    } catch (error) {
      // 捕获执行错误
      console.error('[CC Bridge] Agent 执行错误:', error);
      if (message.sessionWebhook) {
        await sendAsyncReply(message.sessionWebhook, {
          content: `执行失败: ${error instanceof Error ? error.message : '未知错误'}`,
          format: 'text',
        });
      }
    }
  }
}
