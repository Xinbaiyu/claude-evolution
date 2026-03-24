/**
 * 通知渠道抽象接口
 */

export interface Notification {
  readonly title: string;
  readonly body: string;
  readonly type: 'reminder' | 'analysis' | 'system';
  readonly data?: Record<string, unknown>;
}

export interface NotificationChannel {
  readonly name: string;
  send(notification: Notification): Promise<void>;
}
