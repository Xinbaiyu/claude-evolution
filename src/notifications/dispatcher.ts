/**
 * 多渠道通知分发器
 * 并行分发到所有启用的渠道，单渠道失败不影响其他
 */

import { logger } from '../utils/index.js';
import type { Notification, NotificationChannel } from './channel.js';

export class NotificationDispatcher {
  private readonly channels: NotificationChannel[] = [];

  addChannel(channel: NotificationChannel): void {
    this.channels.push(channel);
  }

  async dispatch(notification: Notification): Promise<void> {
    const results = await Promise.allSettled(
      this.channels.map((ch) => ch.send(notification))
    );

    for (let i = 0; i < results.length; i++) {
      const result = results[i];
      if (result.status === 'rejected') {
        logger.warn(
          `通知渠道 ${this.channels[i].name} 发送失败: ${result.reason}`
        );
      }
    }
  }
}
