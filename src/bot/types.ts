/**
 * Bot 系统类型定义
 */

import type { AnalysisExecutor } from '../analyzers/analysis-executor.js';
import type { ReminderService } from '../reminders/service.js';

/** 平台推送的标准化消息 */
export interface BotMessage {
  platform: string;
  messageId: string;
  chatId: string;
  chatType: 'group' | 'private';
  senderId: string;
  senderName: string;
  content: string;
  rawContent: string;
  timestamp: string;
  /** 钉钉异步回复 URL（有效期约 2 小时） */
  sessionWebhook?: string;
}

/** Bot 回复 */
export interface BotReply {
  content: string;
  format: 'text' | 'markdown';
  /** true 表示需要异步回复（先同步返回占位消息） */
  async?: boolean;
}

/** 命令执行上下文 */
export interface CommandContext {
  message: BotMessage;
  executor?: AnalysisExecutor;
  reminderService?: ReminderService;
}

/** 命令处理器接口 */
export interface CommandHandler {
  readonly name: string;
  readonly aliases: string[];
  readonly description: string;
  match(content: string): boolean;
  execute(ctx: CommandContext): Promise<BotReply>;
}
