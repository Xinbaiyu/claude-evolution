/**
 * 提醒调度器
 * 统一使用 node-cron 调度所有提醒
 */

import cron from 'node-cron';
import type { Reminder } from './types.js';

type TriggerCallback = (reminder: Reminder) => void;

const activeTasks = new Map<string, cron.ScheduledTask>();

/**
 * 将 ISO 8601 时间转换为精确到分钟的 cron 表达式
 * e.g. "2026-03-25T15:30:00+08:00" → "30 15 25 3 *"
 */
export function timeToCronExpression(isoTime: string): string {
  const date = new Date(isoTime);
  const minute = date.getMinutes();
  const hour = date.getHours();
  const dayOfMonth = date.getDate();
  const month = date.getMonth() + 1;
  return `${minute} ${hour} ${dayOfMonth} ${month} *`;
}

export function scheduleReminder(
  reminder: Reminder,
  onTrigger: TriggerCallback,
): void {
  // Cancel existing task if any
  cancelReminder(reminder.id);

  const task = cron.schedule(reminder.cronExpression, () => {
    onTrigger(reminder);

    // One-shot reminders auto-cancel after firing
    if (reminder.type === 'one-shot') {
      cancelReminder(reminder.id);
    }
  });

  activeTasks.set(reminder.id, task);
}

export function cancelReminder(id: string): void {
  const task = activeTasks.get(id);
  if (task) {
    task.stop();
    activeTasks.delete(id);
  }
}

export function cancelAll(): void {
  for (const task of activeTasks.values()) {
    task.stop();
  }
  activeTasks.clear();
}

export function validateCronExpression(expression: string): boolean {
  return cron.validate(expression);
}
