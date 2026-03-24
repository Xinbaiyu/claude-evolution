/**
 * 提醒系统类型定义
 */

export type ReminderType = 'one-shot' | 'recurring';
export type ReminderStatus = 'active' | 'triggered' | 'cancelled';

export interface Reminder {
  readonly id: string;
  readonly message: string;
  readonly type: ReminderType;
  readonly createdAt: string;
  /** ISO 8601 datetime for one-shot reminders */
  readonly triggerAt?: string;
  /** Cron expression for recurring reminders */
  readonly schedule?: string;
  /** Generated cron expression (for one-shot, derived from triggerAt) */
  readonly cronExpression: string;
  readonly status: ReminderStatus;
}

export interface CreateReminderInput {
  readonly message: string;
  readonly triggerAt?: string;
  readonly schedule?: string;
}
