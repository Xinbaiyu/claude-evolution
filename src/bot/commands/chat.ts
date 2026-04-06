/**
 * LLM 对话 fallback handler — 调用 Claude API，异步回复
 */

import type { CommandHandler, CommandContext, BotReply, BotMessage } from '../types.js';
import { ChatContextManager } from '../chat-context.js';
import { sendAsyncReply } from '../async-reply.js';
import { loadConfig } from '../../config/index.js';
import { createLLMClient } from '../../llm/client-factory.js';
import { logToFile } from '../file-logger.js';

const SYSTEM_PROMPT = `你是一个友好的编程助手，通过钉钉群聊与用户交互。
回复要简洁清晰，适合在手机上阅读。
使用中文回复。如果用户问的是技术问题，可以给出代码示例。
不要使用过多的 emoji。回复控制在 1500 字以内。`;

export class ChatCommand implements CommandHandler {
  readonly name = 'chat';
  readonly aliases: string[] = [];
  readonly description = 'AI 对话（发送任意内容即可触发）';

  private readonly contextManager: ChatContextManager;

  constructor(contextManager: ChatContextManager) {
    this.contextManager = contextManager;
  }

  /** 始终不匹配（仅作为 fallback） */
  match(): boolean {
    return false;
  }

  async execute(ctx: CommandContext): Promise<BotReply> {
    const { message } = ctx;

    // 记录用户消息
    this.contextManager.addMessage(message.chatId, 'user', message.content);

    // 异步执行 LLM 调用
    this.callLLMAndReply(message).catch((error) => {
      logToFile('[Bot Chat] LLM 调用失败:', error);
      console.error('[Bot Chat] LLM 调用失败:', error);
      // 尝试通过 sessionWebhook 发送错误通知
      if (message.sessionWebhook) {
        sendAsyncReply(message.sessionWebhook, {
          content: `AI 回复失败: ${error instanceof Error ? error.message : '未知错误'}`,
          format: 'text',
        }).catch(() => { /* 静默 */ });
      }
    });

    // 同步返回占位
    return { content: '正在思考...', format: 'text', async: true };
  }

  private async callLLMAndReply(message: BotMessage): Promise<void> {
    logToFile('[Bot Chat] 开始调用 LLM，消息:', message.content);
    const config = await loadConfig();
    logToFile('[Bot Chat] 配置已加载，activeProvider:', config.llm.activeProvider);

    // 获取当前激活提供商的配置
    const { activeProvider } = config.llm;
    const activeConfig = (() => {
      switch (activeProvider) {
        case 'claude':
          return config.llm.claude;
        case 'openai':
          return config.llm.openai;
        case 'ccr':
          return config.llm.ccr;
        default:
          throw new Error(`Unknown activeProvider: ${activeProvider}`);
      }
    })();

    // 使用统一的 LLM 客户端工厂
    logToFile('[Bot Chat] 正在创建 LLM 客户端...');
    const llmClient = await createLLMClient(config);
    logToFile('[Bot Chat] LLM 客户端已创建');

    // 构建消息历史
    const history = this.contextManager.getHistory(message.chatId);
    const messages = history.map((m) => ({
      role: m.role as 'user' | 'assistant',
      content: m.content,
    }));
    logToFile('[Bot Chat] 消息历史:', messages.length, '条');

    // 调用统一接口
    logToFile('[Bot Chat] 正在调用 LLM API...');
    const response = await llmClient.createCompletion({
      model: activeConfig.model,
      messages,
      maxTokens: activeConfig.maxTokens,
      temperature: activeConfig.temperature,
      systemPrompt: SYSTEM_PROMPT,
    });

    logToFile('[Bot Chat] LLM API 调用成功，响应长度:', response.content?.length || 0);
    const replyText = response.content || '（无回复内容）';

    // 记录 assistant 回复
    this.contextManager.addMessage(message.chatId, 'assistant', replyText);

    // 异步推送
    if (message.sessionWebhook) {
      logToFile('[Bot Chat] 正在发送回复到钉钉...');
      await sendAsyncReply(message.sessionWebhook, {
        content: replyText,
        format: 'markdown',
      });
      logToFile('[Bot Chat] 回复已发送');
    }
  }
}
