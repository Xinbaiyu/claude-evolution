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
import { logToFile } from './file-logger.js';

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
    logToFile('[DingTalk Bot] start() 方法被调用');

    if (!this.config.clientId || !this.config.clientSecret) {
      logToFile('[DingTalk Bot] clientId 或 clientSecret 未配置，跳过 Stream 连接');
      return;
    }

    // Intercept console.log to capture SDK debug output
    const originalLog = console.log;
    const originalError = console.error;
    console.log = (...args: unknown[]) => {
      logToFile('[SDK-LOG]', ...args);
      originalLog.apply(console, args);
    };
    console.error = (...args: unknown[]) => {
      logToFile('[SDK-ERROR]', ...args);
      originalError.apply(console, args);
    };

    logToFile('[DingTalk Bot] 准备创建 DWClient');
    this.client = new DWClient({
      clientId: this.config.clientId,
      clientSecret: this.config.clientSecret,
      debug: true,  // 启用 debug 模式查看详细日志
      keepAlive: false,
    });

    // 捕获 SDK 内部未处理的错误，防止进程崩溃
    this.client.on('error', (err: Error) => {
      logToFile('[DingTalk Bot] Stream 错误:', err.message);
    });

    // 注册机器人消息回调
    // 使用钉钉 2.0 API 的 topic
    const CALLBACK_TOPIC = '/v1.0/im/bot/messages/get';
    this.client.registerCallbackListener(CALLBACK_TOPIC, (msg: DWClientDownStream) => {
      logToFile('[DingTalk Bot] 收到消息:', msg.headers.messageId);
      this.handleStreamMessage(msg);
    });

    logToFile('[DingTalk Bot] 正在连接...');
    await this.client.connect();
    logToFile('[DingTalk Bot] Stream 连接已建立');

    // Keep console intercept active to capture all SDK logs
    // Don't restore console.log/error yet
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
    logToFile('[DingTalk Bot] handleStreamMessage 被调用');
    logToFile('[DingTalk Bot] downstream.data:', downstream.data);

    // 立即响应 ACK，避免钉钉 60s 内重试
    if (this.client) {
      this.client.socketCallBackResponse(downstream.headers.messageId, { status: 'SUCCESS', message: 'OK' });
      logToFile('[DingTalk Bot] ACK 已发送');
    }

    // 异步处理消息
    this.processMessage(downstream).catch((error) => {
      logToFile('[DingTalk Bot] 处理消息失败:', error);
    });
  }

  private async processMessage(downstream: DWClientDownStream): Promise<void> {
    const body = JSON.parse(downstream.data);
    logToFile('[DingTalk Bot] 消息内容:', body.msgtype, body.text?.content || '(非文本)');
    logToFile('[DingTalk Bot] sessionWebhook:', body.sessionWebhook ? '有' : '无');

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

    logToFile('[DingTalk Bot] 检查 handler 是否存在:', this.handler ? '是' : '否');

    if (!this.handler) {
      logToFile('[DingTalk Bot] handler 不存在，回复「机器人未就绪」');
      if (message.sessionWebhook) {
        await sendAsyncReply(message.sessionWebhook, {
          content: '机器人未就绪',
          format: 'text',
        });
      }
      return;
    }

    logToFile('[DingTalk Bot] 准备调用 handler 处理消息');
    const reply = await this.handler(message);
    logToFile('[DingTalk Bot] handler 返回结果:', reply);

    // Stream 模式下所有回复都通过 sessionWebhook 推送
    if (message.sessionWebhook) {
      logToFile('[DingTalk Bot] 准备发送异步回复');
      await sendAsyncReply(message.sessionWebhook, reply);
      logToFile('[DingTalk Bot] 异步回复已发送');
    }
  }
}
