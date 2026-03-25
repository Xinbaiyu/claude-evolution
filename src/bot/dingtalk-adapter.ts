/**
 * 钉钉 Bot Adapter — Stream 模式（WebSocket 长连接，无需公网 IP）
 *
 * 使用 dingtalk-stream SDK 建立与钉钉服务器的长连接，
 * 通过 TOPIC_ROBOT 订阅接收群聊 @Bot 消息。
 * 回复通过 sessionWebhook POST 推送。
 */

import { DWClient, TOPIC_ROBOT } from 'dingtalk-stream';
import type { DWClientDownStream } from 'dingtalk-stream';
import type { BotAdapter } from './adapter.js';
import type { BotMessage, BotReply } from './types.js';
import { sendAsyncReply } from './async-reply.js';

interface DingTalkStreamConfig {
  clientId: string;
  clientSecret: string;
}

export class DingTalkBotAdapter implements BotAdapter {
  readonly platform = 'dingtalk';
  private handler: ((msg: BotMessage) => Promise<BotReply>) | null = null;
  private client: DWClient | null = null;
  private readonly config: DingTalkStreamConfig;

  constructor(config: DingTalkStreamConfig) {
    this.config = config;
  }

  async start(): Promise<void> {
    if (!this.config.clientId || !this.config.clientSecret) {
      console.log('[DingTalk Bot] clientId 或 clientSecret 未配置，跳过 Stream 连接');
      return;
    }

    this.client = new DWClient({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      debug: false,
      keepAlive: true,
    });

    // 注册机器人消息回调
    this.client.registerCallbackListener(TOPIC_ROBOT, (msg: DWClientDownStream) => {
      console.log('[DingTalk Bot] 收到消息:', msg.headers.messageId);
      this.handleStreamMessage(msg);
    });

    await this.client.connect();
    console.log('[DingTalk Bot] Stream 连接已建立');
  }

  async stop(): Promise<void> {
    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }
    this.handler = null;
  }

  onMessage(handler: (msg: BotMessage) => Promise<BotReply>): void {
    this.handler = handler;
  }

  async sendAsync(msg: BotMessage, reply: BotReply): Promise<void> {
    if (!msg.sessionWebhook) return;
    await sendAsyncReply(msg.sessionWebhook, reply);
  }

  private handleStreamMessage(downstream: DWClientDownStream): void {
    // 立即响应 ACK，避免钉钉 60s 内重试
    if (this.client) {
      this.client.socketCallBackResponse(downstream.headers.messageId, { status: 'SUCCESS', message: 'OK' });
    }

    // 异步处理消息
    this.processMessage(downstream).catch((error) => {
      console.error('[DingTalk Bot] 处理消息失败:', error);
    });
  }

  private async processMessage(downstream: DWClientDownStream): Promise<void> {
    const body = JSON.parse(downstream.data);
    console.log('[DingTalk Bot] 消息内容:', body.msgtype, body.text?.content || '(非文本)');
    console.log('[DingTalk Bot] sessionWebhook:', body.sessionWebhook ? '有' : '无');

    if (body.msgtype !== 'text') {
      // 非文本消息通过 sessionWebhook 回复提示
      if (body.sessionWebhook) {
        await sendAsyncReply(body.sessionWebhook, {
          content: '目前仅支持文本消息',
          format: 'text',
        });
      }
      return;
    }

    const rawContent = body.text?.content || '';
    const content = rawContent.replace(/^\s+/, '').trim();

    const message: BotMessage = {
      platform: 'dingtalk',
      messageId: body.msgId || downstream.headers.messageId || '',
      chatId: body.conversationId || '',
      chatType: body.conversationType === '1' ? 'private' : 'group',
      senderId: body.senderId || '',
      senderName: body.senderNick || '',
      content,
      rawContent,
      timestamp: body.createAt ? new Date(body.createAt).toISOString() : new Date().toISOString(),
      sessionWebhook: body.sessionWebhook,
    };

    if (!this.handler) {
      if (message.sessionWebhook) {
        await sendAsyncReply(message.sessionWebhook, {
          content: '机器人未就绪',
          format: 'text',
        });
      }
      return;
    }

    const reply = await this.handler(message);

    // Stream 模式下所有回复都通过 sessionWebhook 推送
    if (message.sessionWebhook) {
      await sendAsyncReply(message.sessionWebhook, reply);
    }
  }
}
