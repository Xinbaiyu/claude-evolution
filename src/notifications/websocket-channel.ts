/**
 * WebSocket 通知渠道
 * 封装 WebSocketManager 为 NotificationChannel 实现
 */

import type { WebSocketManager } from '../../web/server/websocket.js';
import type { Notification, NotificationChannel } from './channel.js';

export class WebSocketChannel implements NotificationChannel {
  readonly name = 'websocket';

  constructor(private readonly wsManager: WebSocketManager) {}

  async send(notification: Notification): Promise<void> {
    this.wsManager.broadcast('reminder_triggered', {
      title: notification.title,
      body: notification.body,
      type: notification.type,
      ...notification.data,
    });
  }
}
