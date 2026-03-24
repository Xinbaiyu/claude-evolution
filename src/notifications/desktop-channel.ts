/**
 * 桌面通知渠道
 * 封装现有 notifier.ts 为 NotificationChannel 实现
 */

import { sendNotification } from '../utils/notifier.js';
import type { Notification, NotificationChannel } from './channel.js';

export class DesktopChannel implements NotificationChannel {
  readonly name = 'desktop';

  async send(notification: Notification): Promise<void> {
    await sendNotification({
      title: notification.title,
      message: notification.body,
      sound: notification.type === 'reminder',
      urgency: notification.type === 'reminder' ? 'normal' : 'low',
    });
  }
}
