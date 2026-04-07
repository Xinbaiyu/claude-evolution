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
import type { BotMessage, BotReply, ConnectionState, ConnectionStatus, ReconnectConfig } from './types.js';
import { sendAsyncReply } from './async-reply.js';
import { logToFile } from './file-logger.js';

interface DingTalkStreamConfig {
  clientId: string;
  clientSecret: string;
  reconnect?: Partial<ReconnectConfig>;
}

export class DingTalkBotAdapter implements BotAdapter {
  readonly platform = 'dingtalk';
  private handler: ((msg: BotMessage) => Promise<BotReply>) | null = null;
  private client: DWClient | null = null;
  private readonly config: DingTalkStreamConfig;

  // Connection state tracking
  private state: ConnectionState = 'disconnected';
  private lastConnectedAt?: Date;
  private lastDisconnectAt?: Date;
  private lastActivityAt: Date = new Date();

  // Reconnection management
  private reconnectAttempts = 0;
  private reconnectTimer?: NodeJS.Timeout;
  private heartbeatTimer?: NodeJS.Timeout;
  private readonly reconnectConfig: ReconnectConfig;

  constructor(config: DingTalkStreamConfig) {
    this.config = config;
    this.reconnectConfig = {
      enabled: true,
      maxRetries: 10,
      initialDelay: 1000,
      maxDelay: 32000,
      backoffMultiplier: 2,
      ...config.reconnect,
    };
  }

  async start(): Promise<void> {
    logToFile('[DingTalk Bot] start() 方法被调用');

    if (!this.config.clientId || !this.config.clientSecret) {
      logToFile('[DingTalk Bot] clientId 或 clientSecret 未配置，跳过 Stream 连接');
      return;
    }

    // Start connection asynchronously without waiting
    this.connect().catch((err) => {
      logToFile('[DingTalk Bot] 初始连接失败，进入重连流程:', err);
      this.handleDisconnect(err);
    });
  }

  /**
   * Establish connection to DingTalk Stream API
   */
  private async connect(): Promise<void> {
    this.setState('connecting');

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
      keepAlive: false,  // 禁用 SDK 心跳（有 bug）
    });

    // 捕获 SDK 内部未处理的错误，防止进程崩溃
    this.client.on('error', (err: Error) => {
      logToFile('[DingTalk Bot] Stream 错误:', err.message);
      this.handleDisconnect(err);
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

    this.setState('connected');
    this.resetReconnectState();
    // Disable custom heartbeat - rely on SDK's built-in mechanism
    // this.startHeartbeat();
  }

  async stop(): Promise<void> {
    this.stopHeartbeat();
    this.clearReconnectTimer();

    if (this.client) {
      this.client.disconnect();
      this.client = null;
    }

    this.setState('disconnected');
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

    // Update last activity timestamp for heartbeat monitoring
    this.lastActivityAt = new Date();

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

  /**
   * Set connection state and log transition
   */
  private setState(newState: ConnectionState): void {
    if (this.state === newState) return;

    const oldState = this.state;
    this.state = newState;

    logToFile(`[DingTalk Bot] 连接状态: ${oldState} → ${newState}`);

    if (newState === 'connected') {
      this.lastConnectedAt = new Date();
    } else if (newState === 'disconnected') {
      this.lastDisconnectAt = new Date();
    }
  }

  /**
   * Get current connection status
   */
  getStatus(): ConnectionStatus {
    const status: ConnectionStatus = {
      state: this.state,
      lastConnectedAt: this.lastConnectedAt,
      lastDisconnectAt: this.lastDisconnectAt,
      reconnectAttempts: this.reconnectAttempts,
      maxReconnectAttempts: this.reconnectConfig.maxRetries,
    };

    if (this.state === 'connected' && this.lastConnectedAt) {
      const uptimeMs = Date.now() - this.lastConnectedAt.getTime();
      status.uptimeSeconds = Math.floor(uptimeMs / 1000);
    }

    return status;
  }

  /**
   * Handle disconnection and trigger reconnection
   */
  private handleDisconnect(error: Error): void {
    // Only handle disconnection if not already disconnected/reconnecting
    if (this.state === 'disconnected' || this.state === 'reconnecting') {
      return;
    }

    logToFile('[DingTalk Bot] 连接断开:', error.message);
    this.setState('disconnected');
    this.stopHeartbeat();

    if (this.reconnectConfig.enabled) {
      this.scheduleReconnect();
    } else {
      logToFile('[DingTalk Bot] 自动重连已禁用，需手动重启');
    }
  }

  /**
   * Schedule reconnection with exponential backoff
   */
  private scheduleReconnect(): void {
    // Only schedule if in disconnected state
    if (this.state !== 'disconnected') {
      return;
    }

    if (this.reconnectAttempts >= this.reconnectConfig.maxRetries) {
      logToFile(
        `[DingTalk Bot] 达到最大重试次数 (${this.reconnectConfig.maxRetries})，停止重连`,
      );
      return;
    }

    this.setState('reconnecting');
    this.reconnectAttempts++;

    // Calculate delay with exponential backoff
    const delay = Math.min(
      this.reconnectConfig.initialDelay *
        Math.pow(this.reconnectConfig.backoffMultiplier, this.reconnectAttempts - 1),
      this.reconnectConfig.maxDelay,
    );

    logToFile(
      `[DingTalk Bot] 重连尝试 #${this.reconnectAttempts}/${this.reconnectConfig.maxRetries}, 延迟: ${delay}ms`,
    );

    this.reconnectTimer = setTimeout(() => {
      this.performReconnect();
    }, delay);
  }

  /**
   * Perform reconnection attempt
   */
  private async performReconnect(): Promise<void> {
    try {
      // Clean up old client
      if (this.client) {
        this.client.disconnect();
        this.client = null;
      }

      // Attempt to reconnect
      await this.connect();
      logToFile('[DingTalk Bot] 重连成功');
    } catch (err) {
      const error = err instanceof Error ? err : new Error(String(err));
      logToFile('[DingTalk Bot] 重连失败:', error.message);

      this.setState('disconnected');
      this.scheduleReconnect();
    }
  }

  /**
   * Reset reconnection state after successful connection
   */
  private resetReconnectState(): void {
    this.reconnectAttempts = 0;
    this.clearReconnectTimer();
  }

  /**
   * Clear reconnection timer
   */
  private clearReconnectTimer(): void {
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = undefined;
    }
  }

  /**
   * Start heartbeat monitoring (check every 30s, timeout after 60s)
   */
  private startHeartbeat(): void {
    this.stopHeartbeat();
    this.lastActivityAt = new Date();

    this.heartbeatTimer = setInterval(() => {
      const inactiveMs = Date.now() - this.lastActivityAt.getTime();
      const timeoutMs = 60000; // 60 seconds

      if (inactiveMs > timeoutMs) {
        logToFile(
          `[DingTalk Bot] 心跳超时 (${Math.floor(inactiveMs / 1000)}s 无活动)`,
        );
        this.handleDisconnect(new Error('Heartbeat timeout'));
      }
    }, 30000); // Check every 30 seconds
  }

  /**
   * Stop heartbeat monitoring
   */
  private stopHeartbeat(): void {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = undefined;
    }
  }
}
