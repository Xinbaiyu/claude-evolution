/**
 * 提醒调度器
 * one-shot 提醒使用 setTimeout 精确调度
 * recurring 提醒使用 node-cron 调度
 */

import cron from 'node-cron';
import type { Reminder } from './types.js';

type TriggerCallback = (reminder: Reminder) => void;

const activeCronTasks = new Map<string, cron.ScheduledTask>();
const activeTimers = new Map<string, ReturnType<typeof setTimeout>>();

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
  cancelReminder(reminder.id);

  if (reminder.type === 'one-shot' && reminder.triggerAt) {
    const delayMs = new Date(reminder.triggerAt).getTime() - Date.now();
    if (delayMs <= 0) {
      // Already overdue — fire immediately
      onTrigger(reminder);
      return;
    }
    const timer = setTimeout(() => {
      activeTimers.delete(reminder.id);
      onTrigger(reminder);
    }, delayMs);
    activeTimers.set(reminder.id, timer);
    return;
  }

  // Recurring reminders use cron
  const task = cron.schedule(reminder.cronExpression, () => {
    onTrigger(reminder);
  });
  activeCronTasks.set(reminder.id, task);
}

export function cancelReminder(id: string): void {
  const task = activeCronTasks.get(id);
  if (task) {
    task.stop();
    activeCronTasks.delete(id);
  }
  const timer = activeTimers.get(id);
  if (timer) {
    clearTimeout(timer);
    activeTimers.delete(id);
  }
}

export function cancelAll(): void {
  for (const task of activeCronTasks.values()) {
    task.stop();
  }
  activeCronTasks.clear();
  for (const timer of activeTimers.values()) {
    clearTimeout(timer);
  }
  activeTimers.clear();
}

export function validateCronExpression(expression: string): boolean {
  return cron.validate(expression);
}
