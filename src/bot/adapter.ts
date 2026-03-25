/**
 * Bot Adapter 抽象接口
 */

import type { BotMessage, BotReply } from './types.js';

export interface BotAdapter {
  readonly platform: string;
  start(): Promise<void>;
  stop(): Promise<void>;
  onMessage(handler: (msg: BotMessage) => Promise<BotReply>): void;
  /** 异步推送回复（通过 sessionWebhook 等平台机制） */
  sendAsync(msg: BotMessage, reply: BotReply): Promise<void>;
}
