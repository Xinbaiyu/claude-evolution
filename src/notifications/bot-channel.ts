/**
 * 钉钉机器人私聊通知渠道
 * 通过 Stream 机器人的 access_token 调用 oToMessages/batchSend 发送私聊消息
 */

import type { Notification, NotificationChannel } from './channel.js';

const SEND_URL = 'https://api.dingtalk.com/v1.0/robot/oToMessages/batchSend';
const TOKEN_URL = 'https://oapi.dingtalk.com/gettoken';

interface BotChannelConfig {
  clientId: string;
  clientSecret: string;
  /** 接收消息的用户 ID 列表（钉钉 staffId / userId） */
  userIds: string[];
}

export class BotChannel implements NotificationChannel {
  readonly name = 'dingtalk-bot';
  private readonly config: BotChannelConfig;
  private accessToken: string | null = null;
  private tokenExpiresAt = 0;

  constructor(config: BotChannelConfig) {
    this.config = config;
  }

  async send(notification: Notification): Promise<void> {
    if (this.config.userIds.length === 0) return;

    const token = await this.getAccessToken();
    const body = {
      robotCode: this.config.clientId,
      userIds: this.config.userIds,
      msgKey: 'sampleMarkdown',
      msgParam: JSON.stringify({
        title: notification.title,
        text: `### ${notification.title}\n\n${notification.body}`,
      }),
    };

    const response = await fetch(SEND_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-acs-dingtalk-access-token': token,
      },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(10_000),
    });

    if (!response.ok) {
      const text = await response.text().catch(() => '');
      throw new Error(`DingTalk bot send failed: HTTP ${response.status} ${text.slice(0, 200)}`);
    }
  }

  private async getAccessToken(): Promise<string> {
    // 缓存有效期内直接返回
    if (this.accessToken && Date.now() < this.tokenExpiresAt) {
      return this.accessToken;
    }

    const url = `${TOKEN_URL}?appkey=${this.config.clientId}&appsecret=${this.config.clientSecret}`;
    const response = await fetch(url, { signal: AbortSignal.timeout(10_000) });

    if (!response.ok) {
      throw new Error(`DingTalk gettoken failed: HTTP ${response.status}`);
    }

    const data = await response.json() as { access_token?: string; expires_in?: number; errcode?: number; errmsg?: string };

    if (data.errcode && data.errcode !== 0) {
      throw new Error(`DingTalk gettoken error: ${data.errmsg} (${data.errcode})`);
    }

    if (!data.access_token) {
      throw new Error('DingTalk gettoken: no access_token in response');
    }

    this.accessToken = data.access_token;
    // token 有效期 7200s，提前 5 分钟刷新
    this.tokenExpiresAt = Date.now() + ((data.expires_in || 7200) - 300) * 1000;

    return this.accessToken;
  }
}
