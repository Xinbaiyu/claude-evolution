/**
 * 提醒服务
 * 管理提醒的完整生命周期：创建、删除、列表、恢复
 */

import { randomUUID } from 'crypto';
import { logger } from '../utils/index.js';
import { NotificationDispatcher } from '../notifications/dispatcher.js';
import { loadReminders, saveReminders } from './store.js';
import {
  scheduleReminder,
  cancelReminder,
  cancelAll,
  timeToCronExpression,
  validateCronExpression,
} from './scheduler.js';
import type { Reminder, CreateReminderInput } from './types.js';

export class ReminderService {
  private reminders: Reminder[] = [];

  constructor(private readonly dispatcher: NotificationDispatcher) {}

  async create(input: CreateReminderInput): Promise<Reminder> {
    const { message, triggerAt, schedule } = input;

    if (!message) {
      throw new Error('message is required');
    }

    let type: Reminder['type'];
    let cronExpression: string;

    if (triggerAt) {
      const targetDate = new Date(triggerAt);
      if (isNaN(targetDate.getTime())) {
        throw new Error('triggerAt must be a valid ISO 8601 datetime');
      }
      if (targetDate.getTime() <= Date.now()) {
        throw new Error('Reminder time is in the past');
      }
      type = 'one-shot';
      cronExpression = timeToCronExpression(triggerAt);
    } else if (schedule) {
      if (!validateCronExpression(schedule)) {
        throw new Error('Invalid cron expression');
      }
      type = 'recurring';
      cronExpression = schedule;
    } else {
      throw new Error('Either triggerAt or schedule is required');
    }

    const reminder: Reminder = {
      id: randomUUID(),
      message,
      type,
      createdAt: new Date().toISOString(),
      triggerAt,
      schedule,
      cronExpression,
      status: 'active',
    };

    this.reminders = [...this.reminders, reminder];
    await saveReminders(this.reminders);

    scheduleReminder(reminder, (r) => this.handleTrigger(r));

    logger.info(`提醒已创建: ${reminder.id} (${type})`);
    return reminder;
  }

  async delete(id: string): Promise<void> {
    const index = this.reminders.findIndex((r) => r.id === id);
    if (index === -1) {
      throw new Error('Reminder not found');
    }

    cancelReminder(id);
    this.reminders = this.reminders.filter((r) => r.id !== id);
    await saveReminders(this.reminders);

    logger.info(`提醒已删除: ${id}`);
  }

  list(): readonly Reminder[] {
    return this.reminders.filter((r) => r.status === 'active');
  }

  getById(id: string): Reminder | undefined {
    return this.reminders.find((r) => r.id === id);
  }

  async recover(): Promise<void> {
    const persisted = await loadReminders();
    this.reminders = persisted;

    const now = Date.now();
    for (const reminder of persisted) {
      if (reminder.status !== 'active') continue;

      // One-shot reminders that are overdue: trigger immediately
      if (reminder.type === 'one-shot' && reminder.triggerAt) {
        const targetTime = new Date(reminder.triggerAt).getTime();
        if (targetTime <= now) {
          logger.info(`恢复过期提醒，立即触发: ${reminder.id}`);
          this.handleTrigger(reminder);
          continue;
        }
      }

      scheduleReminder(reminder, (r) => this.handleTrigger(r));
    }

    logger.info(`提醒恢复完成: ${persisted.length} 条`);
  }

  shutdown(): void {
    cancelAll();
    logger.info('提醒调度器已关闭');
  }

  private handleTrigger(reminder: Reminder): void {
    logger.info(`提醒触发: ${reminder.message}`);

    this.dispatcher
      .dispatch({
        title: '提醒',
        body: reminder.message,
        type: 'reminder',
        data: {
          reminderId: reminder.id,
          reminderType: reminder.type,
        },
      })
      .catch((err) => logger.error('提醒通知发送失败', err));

    // Mark one-shot as triggered and persist
    if (reminder.type === 'one-shot') {
      this.reminders = this.reminders.map((r) =>
        r.id === reminder.id ? { ...r, status: 'triggered' as const } : r
      );
      saveReminders(this.reminders).catch((err) =>
        logger.error('保存提醒状态失败', err)
      );
    }
  }
}
